const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const profissionalSchema = new Schema({
    customLink: {
        type: String,
        unique: true,
        sparse: true, // Allows null values to support existing records
    },
    estabelecimentoId: {
        type: mongoose.Types.ObjectId,
        ref: 'Estabelecimento',
        required: true,
    },
    nome: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    telefone: {
        type: String,
        default: null,
    },
    servicosId: [{
        type: mongoose.Types.ObjectId,
        ref: 'Servico',
        required: true,
    }],
    status: {
        type: String,
        enum: ['A', 'I', 'E'], // Ativo, Inativo, Excluído
        default: 'A',
        required: true,
    },
    especialidade: {
        type: String,
        default: null,
    },
    bio: {
        type: String,
        default: null,
    },
    dataCadastro: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('Profissional', profissionalSchema);