const express = require('express');
const router = express.Router();
const Cliente = require('../models/cliente');

router.post("/", async (req, res) => {
    const { email } = req.body;
    
    try {
        const existingCliente = await Cliente.findOne({ email });

        if (existingCliente) {
            return res.json({ error: true, message: 'Este e-mail já está cadastrado!' });
        }
        const cliente = await new Cliente(req.body).save();
        res.json({ cliente });
    } catch (err) {
        res.json({ error: true, message: 'Verifique os campos com (*), são obrigatórios!' });
    }
});

router.get("/clientes/:estabelecimentoId", async (req,res) => {
    try {
        const clientes = await Cliente.find({
            estabelecimentoId: req.params.estabelecimentoId,
            status: { $ne: 'E' },
        });
        res.json({
            error:false, clientes: clientes.map((c) => ({
                id: c._id,
                nome:c.nome,
                email:c.email,
                telefone: c.telefone,
                dataCadastro: moment(c.dataCadastro).format('DD/MM/YYYY'),
                documento:c.documento,
                endereco:c.endereco,    
            }))
        })
    } catch (err) {
        res.json({error:true, message: err.message});
    }
});

router.post("/filter", async (req,res) => {
    try{
        const clientes = await Cliente.find(req.body.filters);
        res.json({ error:false,clientes});
    } catch(err) {
        res.json({error:true, message: err.message})
    }
});

router.delete("/delete/:id", async (req,res) => {
    try {
        await Cliente.findByIdAndUpdate( req.params.id, {status:'E'})
        res.json({error:false})
    } catch (err) {
        res.json({error:true, message: err.message});
    }
})

module.exports = router;

