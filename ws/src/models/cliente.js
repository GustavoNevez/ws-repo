const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clienteSchema = new Schema({
    estabelecimentoId: {
        type: mongoose.Types.ObjectId,
        ref: 'Estabelecimento',
    },
    nome: {
        type: String,
        default: null,
        required: true,
    },
    email: {
        type: String,
        default: null,
        required: true,
    },
    senha: {
        type: String,
        default: null,
        
    },
    status: {
        type: String,
        enum: ['A', 'I', 'E'],
        default: 'A',
        required: true,
    },
    endereco: {
        cidade: {
            type: String,
            required: true,
        },
        uf: {
            type: String,
            required: true,
        },
        cep: {
            type: String,
            required: true,
        },
        numero: {
            type: String,
            required: true,
        },
        rua: {
            type: String,
            required: true,
        }
    },
    documento: {
        tipo: {
            type: String,
            enum: ['rg', 'cpf'],
            default: 'cpf',
            required: true,
        },
        numero: {
            type: String,
            required: true,
        }
    },
    dataCadastro: {
        type: Date,
        default: Date.now,
    },
    telefone: {
        type: String,
    }
});

module.exports = mongoose.model('Cliente', clienteSchema);