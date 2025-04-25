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
        },
        uf: {
            type: String,
        },
        cep: {
            type: String,
        },
        numero: {
            type: String,
        },
        rua: {
            type: String,
        }
    },
    documento: {
        tipo: {
            type: String,
            enum: ['rg', 'cpf'],
            default: 'cpf',
        },
        numero: {
            type: String,
        }
    },
    dataCadastro: {
        type: Date,
        default: Date.now,
    },
    telefone: {
        type: String,
        required: true,
    }
});

module.exports = mongoose.model('Cliente', clienteSchema);