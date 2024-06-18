const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const servico = new Schema ({
    estabelecimentoId: {
        type: mongoose.Types.ObjectId,
        ref: 'Estabelecimento',
    },
    titulo: {
        type:String,
        required: true,
    },
    preco: {
        type:Number,
        required: true,
    },
    duracao: {
        type:Date, 
        required: true,
    },
    recorrencia: {
        type:Number,        
        required: true,
    },
    descricao: {
        type: String,
        required: true,
    },
  
    status: {
        type: String,
        required: true,
        enum: ['A','I','E'],
        default: 'A',
        required:true,
    },
    dataCadastro: {
        type: Date,
        default: Date.now,
    },
    
})



module.exports = mongoose.model('Servico', servico)