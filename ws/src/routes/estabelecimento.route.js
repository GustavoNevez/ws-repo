const express = require('express');
const router = express.Router();
const Estabelecimento = require('../models/estabelecimento');
const Servico = require('../models/servico');

// Função para validar se o customLink já está sendo usado
const validateCustomLink = async (customLink, excludeId = null) => {
    if (!customLink) return true; // Se não tiver customLink, é válido

    const query = { customLink };
    if (excludeId) {
        query._id = { $ne: excludeId }; // Exclui o próprio estabelecimento ao atualizar
    }

    const existingEstabelecimento = await Estabelecimento.findOne(query);
    return !existingEstabelecimento; // Retorna true se não existir
};

router.post('/register', async (req, res) => {
    try {
        // Verificar se o customLink já está em uso (se fornecido)
        if (req.body.customLink) {
            const isValid = await validateCustomLink(req.body.customLink);
            if (!isValid) {
                return res.json({ error: true, message: 'Este link personalizado já está sendo usado. Por favor, escolha outro.' });
            }
        }

        const User = await new Estabelecimento(req.body).save();
        User.senha = undefined;
        res.json({ User });
    } catch(err) {
        res.json({ error: true, message: err.message });
    }
});

// Rota para atualizar um estabelecimento (incluindo customLink)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar se o customLink já está em uso (se fornecido)
        if (req.body.customLink) {
            const isValid = await validateCustomLink(req.body.customLink, id);
            if (!isValid) {
                return res.json({ error: true, message: 'Este link personalizado já está sendo usado. Por favor, escolha outro.' });
            }
        }
        
        await Estabelecimento.findByIdAndUpdate(id, req.body);
        res.json({ error: false, message: 'Estabelecimento atualizado com sucesso!' });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

// Rota para buscar estabelecimento pelo customLink
router.get('/link/:customLink', async (req, res) => {
    try {
        const { customLink } = req.params;
        const estabelecimento = await Estabelecimento.findOne({ customLink });
        
        if (!estabelecimento) {
            return res.json({ error: true, message: 'Estabelecimento não encontrado' });
        }
        
        res.json({ 
            error: false, 
            estabelecimento: {
                id: estabelecimento._id,
                nome: estabelecimento.nome,
                customLink: estabelecimento.customLink
            } 
        });
    } catch (err) {
        res.json({ error: true, message: err.message });
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
            'nome customLink'
        );
        res.json({ error: false, estabelecimento });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

module.exports = router;