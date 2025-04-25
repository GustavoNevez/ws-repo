const express = require('express');
const router = express.Router();
const Horario = require('../models/horario');
const moment = require('moment');

// Função auxiliar para criar horários padrão
const createDefaultSchedules = async (estabelecimentoId, profissionalId = null, tipoServico = []) => {
    try {
        // Horários padrão: Segunda à sexta (8h às 18h) e Sábado (8h às 12h)
        const defaultSchedules = [
            {
                estabelecimentoId,
                dias: [1, 2, 3, 4, 5], // Segunda a sexta
                inicio: new Date('2025-01-01T08:00:00.000Z'),
                fim: new Date('2025-01-01T18:00:00.000Z')
            },
            {
                estabelecimentoId,
                dias: [6], // Sábado
                inicio: new Date('2025-01-01T08:00:00.000Z'),
                fim: new Date('2025-01-01T12:00:00.000Z')
            }
        ];
        
        // Adicionar profissionalId apenas se foi fornecido
        if (profissionalId) {
            defaultSchedules.forEach(schedule => {
                schedule.profissionalId = profissionalId;
            });
        }
        
        // Adicionar tipoServico apenas se foi fornecido e não estiver vazio
        if (tipoServico && tipoServico.length > 0) {
            defaultSchedules.forEach(schedule => {
                schedule.tipoServico = tipoServico;
            });
        }
        
        return await Horario.insertMany(defaultSchedules);
    } catch (error) {
        console.error('Erro ao criar horários padrão:', error);
        throw error;
    }
};
// Função auxiliar para verificar conflitos de horários
const verificarConflitosHorario = async (novoHorario) => {
    // Se o horário não estiver ativo, não precisa verificar conflitos
    if (novoHorario.status !== 'A') {
        return { temConflito: false };
    }
    
    console.log('Verificando conflitos para:', JSON.stringify(novoHorario));
    
    // Definir o escopo (estabelecimento ou profissional específico)
    const escopo = novoHorario.profissionalId ? 
        { estabelecimentoId: novoHorario.estabelecimentoId, profissionalId: novoHorario.profissionalId } : 
        { estabelecimentoId: novoHorario.estabelecimentoId, profissionalId: { $exists: false } };
    
    // Buscar todos os horários ativos do mesmo escopo
    const horariosAtivos = await Horario.find({
        ...escopo,
        status: 'A',
        // Excluir o próprio horário se estiver sendo atualizado
        ...(novoHorario._id ? { _id: { $ne: novoHorario._id } } : {})
    });
    
    console.log(`Encontrados ${horariosAtivos.length} horários ativos no mesmo escopo`);
    
    // Verificar se algum horário ativo tem dias que conflitam com o novo horário
    for (const horario of horariosAtivos) {
        // Verificar se há sobreposição de dias
        const diasConflitantes = horario.dias.filter(dia => novoHorario.dias.includes(dia));
        
        if (diasConflitantes.length > 0) {
            console.log(`Conflito encontrado nos dias: ${diasConflitantes.join(', ')}`);
            return { 
                temConflito: true, 
                diasConflitantes,
                horarioConflitante: horario 
            };
        }
    }
    
    console.log('Nenhum conflito encontrado');
    return { temConflito: false };
};

router.post('/', async (req, res) => {
    try {
        const novoHorario = req.body;
        
        // Verificar conflitos de horários ativos
        const { temConflito, diasConflitantes, horarioConflitante } = 
            await verificarConflitosHorario(novoHorario);
        
        if (temConflito) {
            return res.json({ 
                error: true, 
                message: `Conflito com horário já cadastrado nos dias: ${diasConflitantes.join(', ')}`,
                horarioConflitante
            });
        }
        
        const horario = await new Horario(novoHorario).save();
        res.json({ error: false, horario });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});
// Endpoint para ativar/desativar horário
router.put('/status/:horarioId', async (req, res) => {
    try {
        const { horarioId } = req.params;
        const { status } = req.body;
        
        if (!['A', 'I'].includes(status)) {
            return res.json({ error: true, message: 'Status inválido. Use A para ativo ou I para inativo.' });
        }
        
        const horario = await Horario.findById(horarioId);
        if (!horario) {
            return res.json({ error: true, message: 'Horário não encontrado' });
        }
        
        // Se estiver ativando o horário, verificar conflitos
        if (status === 'A') {
            const novoHorario = { ...horario.toObject(), status: 'A' };
            const { temConflito, diasConflitantes } = await verificarConflitosHorario(novoHorario);
            
            if (temConflito) {
                return res.json({ 
                    error: true, 
                    message: `Não é possível ativar este horário pois conflita com outro horário ativo nos dias: ${diasConflitantes.join(', ')}`
                });
            }
        }
        
        await Horario.findByIdAndUpdate(horarioId, { status });
        res.json({ error: false, message: `Horário ${status === 'A' ? 'ativado' : 'desativado'} com sucesso` });
    } catch (err) {
        console.error('Erro ao alterar status do horário:', err);
        res.json({ error: true, message: err.message });
    }
});
router.get('/estabelecimento/:estabelecimentoId', async (req, res) => {
    try {
        const { estabelecimentoId } = req.params;
        const horarios = await Horario.find({
            estabelecimentoId,
        });
        
        // Se não houver horários, criar horários padrão
        if (horarios.length === 0) {
            console.log(`Nenhum horário encontrado para o estabelecimento ${estabelecimentoId}. Criando horários padrão.`);
            try {
                const defaultHorarios = await createDefaultSchedules(estabelecimentoId);
                return res.json({ horarios: defaultHorarios });
            } catch (defaultError) {
                console.error('Erro ao criar horários padrão:', defaultError);
                // Continuar com array vazio em caso de erro
                return res.json({ horarios: [] });
            }
        }
        
        res.json({ horarios });
    } catch (err) {
        console.error('Erro ao buscar horários:', err);
        res.json({ error: true, message: err.message });
    }
});

// Novo endpoint para buscar horários por profissional
router.get('/profissional/:profissionalId', async (req, res) => {
    try {
        const { profissionalId } = req.params;
        const horarios = await Horario.find({
            profissionalId
        });
        res.json({ error: false, horarios });
    } catch (err) {
        console.error('Erro ao buscar horários do profissional:', err);
        res.json({ error: true, message: err.message });
    }
});

// Novo endpoint para criar horários padrão
router.post('/default', async (req, res) => {
    try {
        const { estabelecimentoId, profissionalId, tipoServico } = req.body;
        
        if (!estabelecimentoId) {
            return res.json({ error: true, message: 'ID do estabelecimento é obrigatório' });
        }
        
        // Verificar se já existem horários para o profissional ou estabelecimento
        const query = profissionalId 
            ? { estabelecimentoId, profissionalId }
            : { estabelecimentoId, profissionalId: { $exists: false } };
        
        const existingSchedules = await Horario.find(query);
        
        if (existingSchedules.length > 0) {
            return res.json({ 
                error: false, 
                message: 'Horários já existem',
                horarios: existingSchedules 
            });
        }
        
        // Criar horários padrão
        const horarios = await createDefaultSchedules(estabelecimentoId, profissionalId, tipoServico);
        
        res.json({ error: false, message: 'Horários padrão criados com sucesso', horarios });
    } catch (err) {
        console.error('Erro ao criar horários padrão:', err);
        res.json({ error: true, message: err.message });
    }
});

router.put('/:horarioId', async (req, res) => {
    try {
        const { horarioId } = req.params;
        const horario = req.body;
        
        // Verificar conflitos se o horário estiver ativo
        if (horario.status === 'A') {
            const { temConflito, diasConflitantes } = 
                await verificarConflitosHorario({ ...horario, _id: horarioId });
            
            if (temConflito) {
                return res.json({ 
                    error: true, 
                    message: `Conflito com horário já cadastrado nos dias: ${diasConflitantes.join(', ')}`
                });
            }
        }

        await Horario.findByIdAndUpdate(horarioId, horario);
        res.json({ error: false, message: 'Horário atualizado com sucesso' });
    } catch (err) {
        console.error('Erro ao atualizar horário:', err);
        res.json({ error: true, message: err.message });
    }
});

router.delete('/:horarioId', async (req, res) => {
    try {
        const { horarioId } = req.params;
        await Horario.findByIdAndDelete(horarioId);
        res.json({ error: false, message: "Excluído com sucesso!" });
    } catch (err) {
        console.error('Erro ao excluir horário:', err);
        res.json({ error: true, message: err.message });
    }
});




module.exports = router;