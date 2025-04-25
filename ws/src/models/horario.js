const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const horario = new Schema ({
    estabelecimentoId: {
        type: mongoose.Types.ObjectId,
        ref: 'Estabelecimento',
        required:true,
    },
    tipoServico: [{
        type: mongoose.Types.ObjectId,
        ref: 'Servico',
        required: false, // Tornar opcional para permitir horários gerais
    }],
    profissionalId: {
        type: mongoose.Types.ObjectId,
        ref: 'Profissional',
        required: false, // Tornar opcional para permitir horários do estabelecimento
    },
    dias: {
        type: [Number],
        required: true,
    },
    inicio: {
        type:Date,
        required:true,
    },
    fim: {
        type:Date,
        required:true,
    },
    dataCadastro: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['A', 'I'],  // A = Ativo, I = Inativo
        default: 'A',
        required: true,
    }
});



module.exports = mongoose.model('Horario', horario)