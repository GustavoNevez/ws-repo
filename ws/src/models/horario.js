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
        required:true,
    }],
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
    }
});



module.exports = mongoose.model('Horario', horario)