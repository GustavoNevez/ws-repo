const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const Schema = mongoose.Schema;

const estabelecimento = new Schema ({
    customLink: {
        type: String,
        unique: true,
        sparse: true, // Allows null values to support existing records
    },
    nome: {
        type: String,
        default:null,
        required:true,
    },
    email: {
        type: String,
        default:null,
        required:true,
    },
    senha: {
        type: String,
        default: null,
        select:false,
        required:true,
    },
    telefone: {
        type: String,
        default:null,
    },
 
    
    dataCadastro: {
        type: Date,
        default: Date.now,
    }
})

estabelecimento.pre("save", async function(next)  {
    const hash = await bcryptjs.hash(this.senha, 10);
    this.senha = hash;
    
})

module.exports = mongoose.model('Estabelecimento', estabelecimento)