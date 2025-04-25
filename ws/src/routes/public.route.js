const express = require('express');
const router = express.Router();
const Estabelecimento = require('../models/estabelecimento');
const Profissional = require('../models/profissional');
const Servico = require('../models/servico');
const Horario = require('../models/horario');

// Rota para acessar um estabelecimento pelo seu link personalizado
router.get('/e/:customLink', async (req, res) => {
    try {
        const { customLink } = req.params;
        
        // Buscar o estabelecimento pelo customLink
        const estabelecimento = await Estabelecimento.findOne({ 
            customLink,
        });
        
        if (!estabelecimento) {
            return res.json({ error: true, message: 'Estabelecimento não encontrado' });
        }
        
        // Buscar todos os profissionais ativos deste estabelecimento
        const profissionais = await Profissional.find({
            estabelecimentoId: estabelecimento._id,
            status: 'A'
        }).select('_id nome especialidade customLink');
        
        // Buscar todos os serviços ativos deste estabelecimento
        const servicos = await Servico.find({
            estabelecimentoId: estabelecimento._id,
            status: 'A'
        }).select('_id titulo preco duracao');
        
        res.json({
            error: false,
            estabelecimento: {
                id: estabelecimento._id,
                nome: estabelecimento.nome,
                customLink: estabelecimento.customLink
            },
            profissionais: profissionais.map(p => ({
                id: p._id,
                nome: p.nome,
                especialidade: p.especialidade,
                customLink: p.customLink
            })),
            servicos: servicos.map(s => ({
                id: s._id,
                titulo: s.titulo,
                preco: s.preco,
                duracao: s.duracao
            }))
        });
    } catch (err) {
        console.error('Erro ao buscar estabelecimento:', err);
        res.json({ error: true, message: err.message });
    }
});

// Rota para acessar um profissional pelo seu link personalizado
router.get('/p/:customLink', async (req, res) => {
    try {
        const { customLink } = req.params;
        
        // Buscar o profissional pelo customLink
        const profissional = await Profissional.findOne({ 
            customLink,
            status: 'A' 
        });
        
        if (!profissional) {
            return res.json({ error: true, message: 'Profissional não encontrado' });
        }
        
        // Buscar o estabelecimento deste profissional
        const estabelecimento = await Estabelecimento.findById(profissional.estabelecimentoId);
        
        if (!estabelecimento) {
            return res.json({ error: true, message: 'Estabelecimento do profissional não encontrado' });
        }
        
        // Buscar apenas os serviços que este profissional oferece
        const servicos = await Servico.find({
            _id: { $in: profissional.servicosId },
            estabelecimentoId: profissional.estabelecimentoId,
            status: 'A'
        }).select('_id titulo preco duracao');
        
        // Buscar os horários disponíveis deste profissional
        const horarios = await Horario.find({
            profissionalId: profissional._id,
            estabelecimentoId: profissional.estabelecimentoId
        });
        
        res.json({
            error: false,
            profissional: {
                id: profissional._id,
                nome: profissional.nome,
                especialidade: profissional.especialidade,
                bio: profissional.bio,
                customLink: profissional.customLink
            },
            estabelecimento: {
                id: estabelecimento._id,
                nome: estabelecimento.nome,
                customLink: estabelecimento.customLink
            },
            servicos: servicos.map(s => ({
                id: s._id,
                titulo: s.titulo,
                preco: s.preco,
                duracao: s.duracao
            })),
            horarios: horarios.map(h => ({
                dias: h.dias,
                inicio: h.inicio,
                fim: h.fim
            }))
        });
    } catch (err) {
        console.error('Erro ao buscar profissional:', err);
        res.json({ error: true, message: err.message });
    }
});

module.exports = router;