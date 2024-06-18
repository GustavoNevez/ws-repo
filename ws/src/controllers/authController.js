const express = require('express');
const router = express.Router();
const Estabelecimento = require('caminho/para/modelo/Estabelecimento');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authConfig = require('caminho/para/authConfig');

router.post('/register', async (req, res) => {
    try {
        const existingUser = await Estabelecimento.findOne({ email: req.body.email });
        if (existingUser) {
            return res.json({ error: 'E-mail já está em uso' }); 
        }
        const newUser = await new Estabelecimento(req.body).save();
        newUser.senha = undefined;
        const token = jwt.sign({
            id: newUser._id,
        }, authConfig.secret, {
            expiresIn: 86400
        });
        return res.json({ user: { id: newUser._id, nome: newUser.nome }, token });
    } catch (err) {
        return res.json({ error: 'Todos os campos do registro são obrigatórios!' });  
    }
});

router.post('/auth', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const user = await Estabelecimento.findOne({ email }).select("+senha");
        if (!user) {
            return res.json({ error: "Email não encontrado" }); 
        }
        if (!await bcrypt.compare(senha, user.senha)) {
            return res.json({ error: "Senha inválida" });  
        }
        user.senha = undefined;
        const token = jwt.sign({
            id: user._id,
        }, authConfig.secret, {
            expiresIn: 86400
        });
        return res.json({ user: { id: user._id, nome: user.nome }, token });
    } catch (err) {
        return res.json({ error: "Erro no servidor, entre em contato com suporte!" });  
    }
});

module.exports = router;