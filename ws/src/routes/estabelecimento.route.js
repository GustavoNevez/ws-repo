const express = require('express');
const router = express.Router();
const Estabelecimento = require('../models/estabelecimento');
const Servico = require('../models/servico');

router.post('/register', async (req,res) =>{
    try {
        const User = await new Estabelecimento(req.body).save();
        User.senha = undefined;
        res.json({User});
    } catch(err){
        res.json({error:true, message: err.message});
    }
});

router.get('/servicos/:estabelecimentoId', async (req,res) => {
    try {
        const { estabelecimentoId } = req.params;
        const servicos = await Servico.find({
            estabelecimentoId,
            status: 'A'
        }).select('_id titulo');
        res.json({
            servicos: servicos.map(s=>({ label: s.titulo, value: s._id}))
        });
    } catch (err){
        res.json({ error: true, message: err.message });
    }
     
});

router.get('/:id', async (req, res) => {
    try {
        const estabelecimento = await Estabelecimento.findById(req.params.id).select(
            'nome'
        );
        res.json({error:false, estabelecimento});
    } catch (err) {
        res.json({ error: true, message: err.message});
    }
});

module.exports = router;