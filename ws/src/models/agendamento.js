const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const agendamento = new Schema ({

    clienteId: [{
        type: mongoose.Types.ObjectId,
        ref: 'Cliente',
        required:true,
        
    }],
    profissionalId: [{
        type: mongoose.Types.ObjectId,
        ref: 'Profissional',
        required: true,
    }],
    servicoId: [{
        type: mongoose.Types.ObjectId,
        ref: 'Servico',
        required:true,
        
    }],
    estabelecimentoId: [{
        type: mongoose.Types.ObjectId,
        ref: 'Estabelecimento',
        required:true,
        
    }],
    data: {
        type:Date,
        default:null,
        required:true,
    },
    valor: {
        type:Number,
        default:null,
    }, 
    duracao: {
        type: Number,
        required: null,
      },
      status: {
        type: String,
        enum: ['A', 'F', 'E'],
        default: 'A',
        required: true,
    },
   
    dataCadastro: {
        type:Date,
        default:Date.now,
    }
  
    
})



module.exports = mongoose.model('Agendamento', agendamento)