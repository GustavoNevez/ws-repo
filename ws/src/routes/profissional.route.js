const express = require('express');
const router = express.Router();
const Profissional = require('../models/profissional');
const Horario = require('../models/horario');
const Agendamento = require('../models/agendamento');
const Servico = require('../models/servico');
const moment = require('moment');
const util = require('../services/util');
const _ = require('lodash');

// Função para validar se o customLink já está sendo usado
const validateCustomLink = async (customLink, excludeId = null) => {
    if (!customLink) return true; // Se não tiver customLink, é válido

    const query = { customLink };
    if (excludeId) {
        query._id = { $ne: excludeId }; // Exclui o próprio profissional ao atualizar
    }

    const existingProfissional = await Profissional.findOne(query);
    return !existingProfissional; // Retorna true se não existir
};

router.post("/", async (req, res) => {
    try {
        const { email, estabelecimentoId, servicosId, customLink } = req.body;
        
        // Check if professional already exists with this email in this establishment
        const existingProfissional = await Profissional.findOne({ 
            email, 
            estabelecimentoId
        });

        if (existingProfissional) {
            return res.json({ error: true, message: 'Este e-mail já está cadastrado para este estabelecimento!' });
        }
        
        // Verificar se o customLink já está em uso (se fornecido)
        if (customLink) {
            const isValid = await validateCustomLink(customLink);
            if (!isValid) {
                return res.json({ error: true, message: 'Este link personalizado já está sendo usado. Por favor, escolha outro.' });
            }
        }

        // Salvar o profissional
        const profissional = await new Profissional(req.body).save();
        
        // Criar horários padrão para o novo profissional
        try {
            // Criar horários padrão manualmente
            const defaultSchedules = [
                {
                    estabelecimentoId,
                    profissionalId: profissional._id,
                    tipoServico: servicosId || [],
                    dias: [1, 2, 3, 4, 5], // Segunda a sexta
                    inicio: new Date('2025-01-01T08:00:00.000Z'),
                    fim: new Date('2025-01-01T18:00:00.000Z')
                },
                {
                    estabelecimentoId,
                    profissionalId: profissional._id,
                    tipoServico: servicosId || [],
                    dias: [6], // Sábado
                    inicio: new Date('2025-01-01T08:00:00.000Z'),
                    fim: new Date('2025-01-01T12:00:00.000Z')
                }
            ];
            
            await Horario.insertMany(defaultSchedules);
            
            console.log(`Horários padrão criados para o profissional ${profissional._id}`);
        } catch (scheduleErr) {
            console.error('Erro ao criar horários padrão para o profissional:', scheduleErr);
            // Continuar mesmo se falhar a criação dos horários
        }
        
        res.json({ error: false, profissional });
    } catch (err) {
        console.error('Erro ao cadastrar profissional:', err);
        res.json({ error: true, message: err.message });
    }
});

// Rota para buscar profissional pelo customLink
router.get('/link/:customLink', async (req, res) => {
    try {
        const { customLink } = req.params;
        const profissional = await Profissional.findOne({ 
            customLink,
            status: 'A' 
        });
        
        if (!profissional) {
            return res.json({ error: true, message: 'Profissional não encontrado' });
        }
        
        // Buscar serviços do profissional para mostrar na página de agendamento
        const servicos = await Servico.find({
            _id: { $in: profissional.servicosId },
            status: 'A'
        }).select('_id titulo duracao preco');
        
        res.json({ 
            error: false, 
            profissional: {
                id: profissional._id,
                nome: profissional.nome,
                especialidade: profissional.especialidade,
                bio: profissional.bio,
                customLink: profissional.customLink,
                estabelecimentoId: profissional.estabelecimentoId,
                servicosId: profissional.servicosId
            },
            servicos: servicos.map(s => ({
                id: s._id,
                titulo: s.titulo,
                duracao: s.duracao,
                preco: s.preco
            }))
        });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

router.get('/estabelecimento/:estabelecimentoId', async (req, res) => {
    try {
        const profissionais = await Profissional.find({
            estabelecimentoId: req.params.estabelecimentoId,
            status: { $ne: 'E' },
        });
        
        res.json({
            error: false, 
            profissionais: profissionais.map((p) => ({
                id: p._id,
                nome: p.nome,
                email: p.email,
                telefone: p.telefone,
                especialidade: p.especialidade,
                servicosId: p.servicosId,
                customLink: p.customLink,
                status: p.status,
                dataCadastro: p.dataCadastro
            }))
        });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

router.get('/servico/:servicoId', async (req, res) => {
    try {
        const profissionais = await Profissional.find({
            servicosId: req.params.servicoId,
            status: 'A'
        });
        
        res.json({
            error: false, 
            profissionais: profissionais.map((p) => ({
                id: p._id,
                nome: p.nome,
                especialidade: p.especialidade
            }))
        });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

router.put("/:id/:estabelecimentoId", async (req, res) => {
    try {
        const { id, estabelecimentoId } = req.params;
     
        const profissional = await Profissional.findOne({ 
            _id: id, 
            estabelecimentoId 
        });
  
        if (!profissional) {
            return res.json({ 
                error: true, 
                message: 'Profissional não encontrado ou não pertence ao estabelecimento.' 
            });
        }
        
        // Verificar se o customLink já está em uso (se fornecido)
        if (req.body.customLink) {
            const isValid = await validateCustomLink(req.body.customLink, id);
            if (!isValid) {
                return res.json({ error: true, message: 'Este link personalizado já está sendo usado. Por favor, escolha outro.' });
            }
        }
        
        await Profissional.findByIdAndUpdate(id, req.body);
        res.json({ error: false, message: 'Profissional atualizado com sucesso!' });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

router.delete('/remove/:id', async (req, res) => {
    try {
        await Profissional.findByIdAndUpdate(req.params.id, { status: 'E' });
        res.json({ error: false });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

router.post('/dias-disponiveis', async (req, res) => {
    try {
        const { data, profissionalId, servicoId, estabelecimentoId } = req.body;
        
        // Verificar se o profissional existe e está ativo
        const profissional = await Profissional.findOne({
            _id: profissionalId,
            status: 'A'
        });
        
        if (!profissional) {
            return res.json({ error: true, message: 'Profissional não encontrado ou inativo' });
        }
        
        // Verificar se o profissional oferece este serviço
        const temServico = profissional.servicosId.some(id => id.toString() === servicoId.toString());
        
        if (!temServico) {
            return res.json({ error: true, message: 'Este profissional não oferece o serviço solicitado' });
        }
        
        // Buscar o serviço para obter a duração
        const servico = await Servico.findById(servicoId).select('duracao');
        if (!servico) {
            return res.json({ error: true, message: 'Serviço não encontrado' });
        }
        
        // Buscar todos os horários do estabelecimento
        let horarios = await Horario.find({ estabelecimentoId });
        
        // IMPORTANTE: Se não houver horários cadastrados para o estabelecimento, criar um horário padrão
        if (horarios.length === 0) {
            // Criar horário padrão (todos os dias da semana, 08:00 às 18:00)
            // Não salvamos no banco, apenas usamos para o cálculo atual
            horarios = [{
                estabelecimentoId: estabelecimentoId,
                // Dias: 0=domingo, 1=segunda, ..., 6=sábado
                dias: [0, 1, 2, 3, 4, 5, 6],
                inicio: moment('2025-01-01T08:00:00.000Z'),
                fim: moment('2025-01-01T18:00:00.000Z')
            }];
        }
        
        let agenda = [];
        let ultimoDia = moment(data);
        
        // Calcular duração do serviço em minutos
        const servicoDuracao = util.horaParaMinutos(moment(servico.duracao).format('HH:mm'));
        const servicoPartes = util.partesMinutos(
            moment(servico.duracao),
            moment(servico.duracao).add(servicoDuracao, 'minutes'),
            util.DURACAO_SERVICO, 
            false
        ).length;
        
        // Procurar horários disponíveis pelos próximos 30 dias ou até encontrar 7 dias com horários
        for (let i = 0; i <= 30 && agenda.length <= 7; i++) {
            const diaDaSemana = moment(ultimoDia).day();
            const partesValidos = horarios.filter((horario) => {
                return horario.dias.includes(diaDaSemana);
            });
            
            if (partesValidos.length > 0) {
                let horariosDoDia = [];
                
                // Calcular todos os slots disponíveis para o dia
                for (let espaco of partesValidos) {
                    const inicio = util.horariosDoDia(ultimoDia, espaco.inicio);
                    const fim = util.horariosDoDia(ultimoDia, espaco.fim);
                    
                    // Calcular o último horário possível para iniciar o serviço
                    // de modo que ele termine antes do fechamento do estabelecimento
                    const ultimoHorarioPossivel = moment(fim).subtract(servicoDuracao, 'minutes');
                    
                    // Só gerar horários até o último horário possível
                    const partes = util.partesMinutos(inicio, ultimoHorarioPossivel, util.DURACAO_SERVICO);
                    
                    horariosDoDia = [
                        ...horariosDoDia,
                        ...partes
                    ];
                }
                
                // Buscar APENAS agendamentos deste profissional para este dia
                const agendamentos = await Agendamento.find({
                    profissionalId,
                    estabelecimentoId,
                    status: 'A',
                    data: {
                        $gte: moment(ultimoDia).startOf('day'),
                        $lte: moment(ultimoDia).endOf('day'),
                    },
                }).select('data duracao -_id');
                
                // Se não houver agendamentos, todos os horários estão livres
                if (agendamentos.length === 0) {
                    // SIMPLIFICAÇÃO: Se não tem agendamentos, todos os slots estão disponíveis
                    // Garantir que só retorne slots com duração suficiente para o serviço
                    let horariosSeparados = [];
                    
                    // Agrupar horários em slots do tamanho do serviço
                    for (let i = 0; i <= horariosDoDia.length - servicoPartes; i++) {
                        horariosSeparados.push([horariosDoDia[i]]);
                    }
                    
                    // Log apenas dos slots finais disponíveis
                    console.log(`Dia ${ultimoDia.format('YYYY-MM-DD')}: ${horariosSeparados.length} horários disponíveis`);
                    
                    if (horariosSeparados.length > 0) {
                        agenda.push({ [ultimoDia.format('YYYY-MM-DD')]: horariosSeparados });
                    }
                    
                    ultimoDia = moment(ultimoDia).add(1, 'day');
                    continue; // Vai para o próximo dia
                }
                
                // Se há agendamentos, mapear horários ocupados
                let horariosOcupados = agendamentos.map((agendamento) => ({
                    inicio: moment(agendamento.data),
                    final: moment(agendamento.data).add(agendamento.duracao, 'minutes'), 
                }));
                
                horariosOcupados = horariosOcupados.map((horario) =>
                    util.partesMinutos(horario.inicio, horario.final, util.DURACAO_SERVICO)
                ).flat();
                
                // Filtrar horários livres
                let horariosLivres = util.splitByValue(horariosDoDia.map((horario) => {
                    return horariosOcupados.includes(horario) ? '-' : horario;
                }), '-').filter(space => space.length > 0);
                
                // Garantir que só retorne slots com duração suficiente para o serviço
                horariosLivres = horariosLivres.filter((horario) => horario.length >= servicoPartes);
                horariosLivres = horariosLivres.map((slot) =>
                    slot.filter(
                        (horario, index) => slot.length - index >= servicoPartes
                    )
                );
                
                // Formatar para retornar ao cliente
                const horariosSeparados = _.flatten(horariosLivres).map(horario => [horario]);
                
                // Log apenas dos slots finais disponíveis
                console.log(`Dia ${ultimoDia.format('YYYY-MM-DD')}: ${horariosSeparados.length} horários disponíveis`);
                
                // Só adicionar dias que tenham horários disponíveis
                if (horariosSeparados.length > 0) {
                    agenda.push({ [ultimoDia.format('YYYY-MM-DD')]: horariosSeparados });
                }
            }
            
            ultimoDia = moment(ultimoDia).add(1, 'day');
        }
        
        console.log(`Resultado final: ${agenda.length} dias com horários disponíveis`);
        
        // IMPORTANTE: Resposta sempre como array mesmo que vazio para compatibilidade
        res.json({ error: false, agenda: agenda });
    } catch (err) {
        console.error('ERRO ao buscar horários disponíveis:', err);
        res.json({ 
            error: true, 
            message: err.message
        });
    }
});

module.exports = router;