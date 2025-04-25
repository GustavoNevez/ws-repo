const express = require('express');
const router = express.Router();

const moment = require('moment');
const Turno = require('../models/turno');
const util = require('../services/util');
const Cliente = require('../models/cliente');
const Servico = require('../models/servico');
const Horario = require('../models/horario');
const Agendamento = require('../models/agendamento');
const Profissional = require('../models/profissional');
const _ = require('lodash');

router.post('/', async (req, res) => {
    try {
        const { servicoId, profissionalId, data, estabelecimentoId, clienteId } = req.body;
       
        // Verificar se o serviço existe
        const servico = await Servico.findById(servicoId);
        if (!servico) {
            return res.json({ error: true, message: 'Serviço não encontrado' });
        }
       
        // Verificar se o profissional existe, está ativo e pertence ao estabelecimento
        const profissional = await Profissional.findOne({
            _id: profissionalId,
            status: 'A',
            estabelecimentoId: estabelecimentoId
        });
       
        if (!profissional) {
            return res.json({ 
                error: true, 
                message: 'Profissional não encontrado, inativo ou não pertence a este estabelecimento' 
            });
        }
       
        // Verificar se o profissional oferece este serviço
        const temServico = profissional.servicosId && 
                          profissional.servicosId.some(id => id.toString() === servicoId.toString());
        if (!temServico) {
            return res.json({ error: true, message: 'Este profissional não oferece o serviço solicitado' });
        }
       
        // Calcular a duração do serviço em minutos
        const duracao = util.horaParaMinutos(moment(servico.duracao).format('HH:mm'));
       
        // Verificar se o profissional já está agendado neste horário
        const dataInicio = moment(data);
        const dataFim = moment(data).add(duracao, 'minutes');
       
        // Simplificar a verificação de conflitos
        const agendamentosConflitantes = await Agendamento.find({
            profissionalId,
            status: 'A',
            data: {
                $lt: dataFim.toDate(),
                $gt: moment(dataInicio).subtract(duracao, 'minutes').toDate()
            }
        });
       
        if (agendamentosConflitantes && agendamentosConflitantes.length > 0) {
            return res.json({
                error: true,
                message: 'O profissional já possui um agendamento neste horário',
                conflitos: agendamentosConflitantes
            });
        }
       
        // Se chegou até aqui, pode criar o agendamento
        const agendamento = new Agendamento({
            servicoId,
            profissionalId,
            estabelecimentoId,
            clienteId,
            data,
            duracao,
            status: 'A'
        });
        
        await agendamento.save();
        res.json({ error: false, agendamento });
    } catch (err) {
        console.error(err);
        res.json({ error: true, message: err.message });
    }
});



router.post('/horarios-disponiveis', async (req, res) => {
    try {
        const { data, estabelecimentoId, servicoId, profissionalId } = req.body;
        
        console.log('Dados recebidos:', req.body);

        // Buscar informações do serviço
        const servico = await Servico.findById(servicoId).select('duracao');
        if (!servico) {
            console.log('Serviço não encontrado:', servicoId);
            return res.json({ error: true, message: 'Serviço não encontrado' });
        }
        console.log('Informações do serviço:', servico);

        // Calcular duração do serviço em minutos
        const servicoDuracao = util.horaParaMinutos(moment(servico.duracao).format('HH:mm'));
        console.log('Duração do serviço em minutos:', servicoDuracao);
        
        // Buscar configuração de turno para o estabelecimento
        const turnoConfig = await Turno.findOne({ estabelecimentoId });
        if (!turnoConfig) {
            console.log('Nenhuma configuração de turno encontrada para o estabelecimento:', estabelecimentoId);
            return res.json({ 
                error: true, 
                message: 'Não há horários cadastrados para este estabelecimento' 
            });
        }
        console.log('Configuração de turno encontrada:', turnoConfig._id);

        // Formatação da data recebida
        const dataSelecionada = moment(data);
        const diaDaSemana = dataSelecionada.day(); // 0-6 (domingo-sábado)
        console.log(`Data selecionada: ${dataSelecionada.format('YYYY-MM-DD')}, Dia da semana: ${diaDaSemana}`);
        
        // Verificar se o dia está configurado e ativo
        const diaConfig = turnoConfig.dias.get(String(diaDaSemana));
        console.log('Configuração do dia:', diaConfig);
        
        if (!diaConfig || !diaConfig.ativo || !diaConfig.periodos || diaConfig.periodos.length === 0) {
            console.log('Dia não configurado ou inativo');
            return res.json({ 
                error: false, 
                horariosDisponiveis: [] 
            });
        }

        // Coletar todos os horários disponíveis do dia baseado nos períodos ativos
        let todosHorariosDoDia = [];

        console.log(`\n--- Processando períodos para ${dataSelecionada.format('YYYY-MM-DD')} ---`);
        for (let i = 0; i < diaConfig.periodos.length; i++) {
            const periodo = diaConfig.periodos[i];
            console.log(`\nProcessando período ${i+1}:`, periodo);
            
            if (periodo.ativo) {
                // Converter o horário de início e fim para o formato de data completa
                const inicioHorario = util.horariosDoDia(dataSelecionada, periodo.inicio);
                const fimHorario = util.horariosDoDia(dataSelecionada, periodo.fim);
                console.log(`Período ativo: ${periodo.inicio} até ${periodo.fim}`);
                
                // Gerar slots de horários para o período
                const slotsHorarios = util.partesMinutos(
                    inicioHorario,
                    fimHorario,
                    util.DURACAO_SERVICO
                );
                console.log('Todos os slots do período:', slotsHorarios);
                
                // Filtrar somente horários onde o serviço pode ser concluído dentro do período
                const horariosValidos = slotsHorarios.filter(horarioStr => {
                    const horarioInicio = moment(`${dataSelecionada.format('YYYY-MM-DD')} ${horarioStr}`, 'YYYY-MM-DD HH:mm');
                    const horarioFimServico = horarioInicio.clone().add(servicoDuracao, 'minutes');
                    
                    // O serviço deve terminar antes ou exatamente no horário de fim do período
                    const isValido = horarioFimServico.isSameOrBefore(fimHorario);
                    if (!isValido) {
                        console.log(`Horário ${horarioStr} inválido: serviço terminaria às ${horarioFimServico.format('HH:mm')}, após o fim do período (${periodo.fim})`);
                    }
                    return isValido;
                });
                
                console.log('Horários válidos neste período:', horariosValidos);
                todosHorariosDoDia = [...todosHorariosDoDia, ...horariosValidos];
            } else {
                console.log('Período inativo, ignorando');
            }
        }

        console.log('\nTodos horários disponíveis antes de verificar agendamentos:', todosHorariosDoDia);

        // Buscar agendamentos existentes para o dia selecionado
        const query = {
            estabelecimentoId,
            status: 'A',
            data: {
                $gte: moment(dataSelecionada).startOf('day'),
                $lte: moment(dataSelecionada).endOf('day'),
            }
        };

        // Filtrar por profissional se especificado
        if (profissionalId) {
            query.profissionalId = profissionalId;
            console.log('Filtrando por profissional:', profissionalId);
        }

        console.log('Query de busca de agendamentos:', query);
        const agendamentos = await Agendamento.find(query).select('data duracao profissionalId');
        console.log('Agendamentos encontrados:', agendamentos.length);
        console.log('Detalhes dos agendamentos:', agendamentos.map(a => ({
            id: a._id,
            data: moment(a.data).format('YYYY-MM-DD HH:mm'),
            duracao: a.duracao,
            profissionalId: a.profissionalId
        })));

        // Calcular horários ocupados considerando a duração de cada agendamento
        // E fazendo a correção do fuso horário
        let horariosOcupados = [];
        
        for (const agendamento of agendamentos) {
            // Agora aplicamos a correção do fuso horário (UTC+3)
            const inicioAgendamento = moment(agendamento.data).add(3, 'hours');
            const fimAgendamento = inicioAgendamento.clone().add(agendamento.duracao, 'minutes');
            
            console.log(`\nProcessando agendamento: início ${inicioAgendamento.format('HH:mm')}, fim ${fimAgendamento.format('HH:mm')}`);
            console.log(`(Horário original no banco: ${moment(agendamento.data).format('HH:mm')})`);
            
            // Gerar todos os slots de tempo ocupados por este agendamento
            const slotsOcupados = util.partesMinutos(
                inicioAgendamento,
                fimAgendamento,
                util.DURACAO_SERVICO
            );
            
            console.log('Slots ocupados por este agendamento:', slotsOcupados);
            horariosOcupados = [...horariosOcupados, ...slotsOcupados];
        }

        // Remover horários duplicados dos ocupados (caso haja sobreposição)
        const horariosOcupadosUnicos = [...new Set(horariosOcupados)];
        console.log('\nTodos os horários ocupados (únicos):', horariosOcupadosUnicos);

        // Calcular quantos slots o serviço ocupa
        const partesDuracao = Math.ceil(servicoDuracao / util.DURACAO_SERVICO);
        console.log(`\nO serviço ocupa ${partesDuracao} slots de ${util.DURACAO_SERVICO} minutos`);

        // Verificar quais horários estão realmente disponíveis considerando a duração do serviço
        const horariosDisponiveis = todosHorariosDoDia.filter(horarioInicio => {
            // Verificar se este horário de início permite que o serviço seja concluído
            // sem conflitar com outros agendamentos
            const momentInicio = moment(`${dataSelecionada.format('YYYY-MM-DD')} ${horarioInicio}`, 'YYYY-MM-DD HH:mm');
            
            // Verificar se algum dos slots necessários já está ocupado
            for (let i = 0; i < partesDuracao; i++) {
                const momentSlot = momentInicio.clone().add(i * util.DURACAO_SERVICO, 'minutes');
                const slotStr = momentSlot.format('HH:mm');
                
                if (horariosOcupadosUnicos.includes(slotStr)) {
                    console.log(`Horário ${horarioInicio} indisponível: slot ${slotStr} já está ocupado`);
                    return false; // Este horário não está disponível
                }
            }
            
            return true; // O horário está disponível para o serviço completo
        });

        console.log('\nHorários disponíveis após verificação de conflitos:', horariosDisponiveis);
        console.log(`Total de ${horariosDisponiveis.length} horários disponíveis para o dia ${dataSelecionada.format('YYYY-MM-DD')}`);

        res.json({ 
            error: false, 
            horariosDisponiveis,
            data: dataSelecionada.format('YYYY-MM-DD')
        });
        
    } catch (err) {
        console.error('Erro ao buscar horários disponíveis:', err);
        res.json({ error: true, message: err.message });
    }
});

router.post('/filtro', async (req,res) =>{
    try {
        const { periodo, estabelecimentoId } = req.body;
        const startDate = moment(periodo.inicio).startOf('day');
        const endDate = moment(periodo.final).endOf('day');
    
        const agendamentos = await Agendamento.find({ estabelecimentoId })
            .where('data').gte(startDate).lte(endDate)
            .populate([
                { path: 'servicoId', select: 'titulo duracao' },
                { path: 'clienteId', select: 'nome' }
            ]);
    
        res.json({ error: false, agendamentos });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});
router.delete('/:agendamentoId', async (req, res) => {
    try {
        const { agendamentoId } = req.params;
        if (!agendamentoId) {
            return res.json({ error: true, message: 'ID do agendamento não fornecido.' });
        }
        const agendamento = await Agendamento.findByIdAndUpdate(agendamentoId, {status:'E'});
        if (!agendamento) {
            return res.json({ error: true, message: 'Agendamento não encontrado.' });
        }
        res.json({ error: false, message: 'Agendamento excluído com sucesso.' });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

router.put('/concluido/:agendamentoId', async (req, res) => {
    try {
        const { agendamentoId } = req.params;
        if (!agendamentoId) {
            return res.json({ error: true, message: 'ID do agendamento não fornecido.' });
        }
        const agendamento = await Agendamento.findByIdAndUpdate(agendamentoId, {status:'F'});
        if (!agendamento) {
            return res.json({ error: true, message: 'Agendamento não encontrado.' });
        }
        res.json({ error: false, message: 'Agendamento finalizado com sucesso.' });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});


router.post('/relatorio', async (req, res) => {
    try {
        const { periodo, estabelecimentoId } = req.body;
        const startDate = moment(periodo.inicio).startOf('day');
        const endDate = moment(periodo.final).endOf('day');

        // Filtra agendamentos com status 'F' dentro do período especificado
        const agendamentos = await Agendamento.find({ 
            estabelecimentoId,
            status: 'F',  // Filtra apenas agendamentos com status 'F'
            data: {
                $gte: startDate.toDate(),
                $lte: endDate.toDate()
            }
        }).select('data duracao valor').populate([
            { path: 'servicoId', select: 'titulo duracao' },
            { path: 'clienteId', select: 'nome' }
        ]);

        // Calcula o total de dinheiro
        const totalDinheiro = agendamentos.reduce((sum, agendamento) => sum + agendamento.valor, 0);

        // Monta o objeto relatorio
        const relatorio = {
            numeroAgendamentos: agendamentos.length,
            totalDinheiro,
            agendamentos,
        };

        res.json({ error: false, relatorio });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

// Novo endpoint para buscar agendamentos dos próximos 7 dias
router.get('/proximos-sete-dias/:estabelecimentoId', async (req, res) => {
    try {
        const { estabelecimentoId } = req.params;
        
        // Calcular datas: hoje até 7 dias depois
        const startDate = moment().startOf('day');
        const endDate = moment().add(7, 'days').endOf('day');
        
        // Buscar agendamentos ativos no período, populando cliente, serviço e profissional
        const agendamentos = await Agendamento.find({ 
            estabelecimentoId: estabelecimentoId, // Corrigido: sem usar $elemMatch
            status: 'A',
            data: {
                $gte: startDate.toDate(),
                $lte: endDate.toDate()
            }
        })
        .populate('clienteId', 'nome')
        .populate('servicoId', 'titulo duracao')
        .populate('profissionalId', 'nome')
        .sort({ data: 1 }); // Ordenar por data crescente
        
        // Formata a resposta para retornar apenas os nomes/títulos em vez de arrays
        const formattedAgendamentos = agendamentos.map(agendamento => {
            const plainAgendamento = agendamento.toObject();
            
            // Extrair os dados do cliente, serviço e profissional
            let cliente = null;
            if (plainAgendamento.clienteId && plainAgendamento.clienteId.length > 0) {
                cliente = {
                    nome: plainAgendamento.clienteId[0].nome,
                    _id: plainAgendamento.clienteId[0]._id
                };
            }
            
            let servico = null;
            if (plainAgendamento.servicoId && plainAgendamento.servicoId.length > 0) {
                servico = {
                    titulo: plainAgendamento.servicoId[0].titulo,
                    duracao: plainAgendamento.servicoId[0].duracao,
                    _id: plainAgendamento.servicoId[0]._id
                };
            }
            
            let profissional = null;
            if (plainAgendamento.profissionalId && plainAgendamento.profissionalId.length > 0) {
                profissional = {
                    nome: plainAgendamento.profissionalId[0].nome,
                    _id: plainAgendamento.profissionalId[0]._id
                };
            }
            
            return {
                _id: plainAgendamento._id,
                cliente: cliente,
                servico: servico,
                profissional: profissional,
                data: plainAgendamento.data,
                valor: plainAgendamento.valor,
                duracao: plainAgendamento.duracao,
                status: plainAgendamento.status,
                dataCadastro: plainAgendamento.dataCadastro
            };
        });
        console.log(formattedAgendamentos);
        
        res.json({ error: false, agendamentos: formattedAgendamentos });
    } catch (err) {
        console.error('Erro ao buscar agendamentos dos próximos 7 dias:', err);
        res.json({ error: true, message: err.message });
    }
});

module.exports = router;