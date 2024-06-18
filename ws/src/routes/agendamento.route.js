const express = require('express');
const router = express.Router();

const moment = require('moment');
const util = require('../services/util');
const Cliente = require('../models/cliente');
const Servico = require('../models/servico');
const Horario = require('../models/horario');
const Agendamento = require('../models/agendamento');
const _ = require('lodash');

router.post('/', async (req, res) => {
    try {
        const { servicoId } = req.body;
        const servico = await Servico.findById(servicoId).select('duracao');

        if (!servico) {
            return res.json({ error: true, message: 'Serviço não encontrado' });
        }
        const duracao = util.horaParaMinutos(moment(servico.duracao).format('HH:mm'));  
        const agendamento = new Agendamento({
            ...req.body,
            duracao
        });
        await agendamento.save();
        res.json({ error: false, agendamento });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

router.post('/dias-disponiveis', async (req, res) => {
    try {
        const { data, estabelecimentoId, servicoId, clienteId } = req.body;
        const servico = await Servico.findById(servicoId).select('duracao');
        const horarios = await Horario.find({ estabelecimentoId: '6665161912377535a22a708f' }); //Deixei esse horarioId fixo, pois vai ser usado apenas no aplicativo

        let agenda = [];
        let ultimoDia = moment(data);

        const servicoDuracao = util.horaParaMinutos(moment(servico.duracao).format('HH:mm'));
        const servicoPartes = util.partesMinutos(
            moment(servico.duracao),
            moment(servico.duracao).add(servicoDuracao, 'minutes'),
            util.DURACAO_SERVICO, false
        ).length;

        for (let i = 0; i <= 365 && agenda.length <= 7; i++) {
            const partesValidos = horarios.filter((horario) => {
                const diaSemanaDisponivel = horario.dias.includes(moment(ultimoDia).day());
                return diaSemanaDisponivel;
            });

            if (partesValidos.length > 0) {
                let horariosDoDia = [];

                for (let espaco of partesValidos) {
                    horariosDoDia = [
                        ...horariosDoDia,
                        ...util.partesMinutos(
                            util.horariosDoDia(ultimoDia, espaco.inicio),
                            util.horariosDoDia(ultimoDia, espaco.fim),
                            util.DURACAO_SERVICO
                        )
                    ];
                }

                const agendamentos = await Agendamento.find({
                    estabelecimentoId,
                    status: 'A',
                    data: {
                        $gte: moment(ultimoDia).startOf('day'),
                        $lte: moment(ultimoDia).endOf('day'),
                    },
                }).select('data duracao -_id'); 

                let horariosOcupados = agendamentos.map((agendamento) => ({
                    inicio: moment(agendamento.data),
                    final: moment(agendamento.data).add(agendamento.duracao, 'minutes'), 
                }));

                horariosOcupados = horariosOcupados.map((horario) =>
                    util.partesMinutos(horario.inicio, horario.final, util.DURACAO_SERVICO)
                ).flat();

                let horariosLivres = util.splitByValue(horariosDoDia.map((horario) => {
                    return horariosOcupados.includes(horario) ? '-' : horario;
                }), '-').filter(space => space.length > 0 );

                horariosLivres = horariosLivres.filter((horario) => horario.length >= servicoPartes);
                           
                horariosLivres = horariosLivres.map((slot) =>
                    slot.filter(
                      (horario, index) => slot.length - index >= servicoPartes
                    )
                  );
             
                const horariosSeparados = _.flatten(horariosLivres).map(horario => [horario]);
                agenda.push({ [ultimoDia.format('YYYY-MM-DD')]: horariosSeparados });
            }
            ultimoDia = moment(ultimoDia).add(1, 'day');
        }
        res.json({ error: false, agenda });
    } catch (err) {
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

module.exports = router;