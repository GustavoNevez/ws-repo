const express = require('express');
const multer = require('multer');
const router = express.Router();
const Servico = require('../models/servico');

router.post("/", async (req,res)=> {
    try{
        const servico = await new Servico(req.body).save();
        res.json({servico});
    }catch(err){
        res.json({error:true, message:err.message})
    }
});

router.put("/:id/:estabelecimentoId", async (req, res) => {
  try {
      const { id, estabelecimentoId } = req.params;
   
      const servico = await Servico.findOne({ _id: id, estabelecimentoId });

      if (!servico) {
          return res.json({ error: true, message: 'Cliente não encontrado ou não pertence ao estabelecimento.' });
      }
      
      await Servico.findByIdAndUpdate(id, req.body);
      res.json({ error: false, message: 'Cliente atualizado com sucesso!' });
  } catch (err) {
    res.json({ error: true, message: err.message });
  }
});

router.get('/estabelecimento/:estabelecimentoId', async (req, res) => {
    try {
      const servicos = await Servico.find({
        estabelecimentoId: req.params.estabelecimentoId,
        status: { $ne: 'E' },
      });   
      res.json({
        error:false, servicos: servicos.map((c) => ({
            id: c._id,
            titulo:c.titulo,
            preco:c.preco,
            duracao: c.duracao,
            recorrencia:c.recorrencia,
            descricao:c.descricao,
            status: c.status,           
        }))
    });
    } catch (err) {
      res.json({ error: true, message: err.message });
    }
  });

router.delete('/remove/:id', async (req, res) => {
    try {
      await Servico.findByIdAndUpdate(req.params.id, { status: 'E' });
      res.json({ error: false });
    } catch (err) {
      res.json({ error: true, message: err.message });
    }
  });

module.exports = router;