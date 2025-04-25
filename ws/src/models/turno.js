const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema para um turno específico dentro de um horário
const periodoSchema = new Schema({
  inicio: {
    type: String, // Formato "HH:MM" para facilitar manipulação
    required: true,
  },
  fim: {
    type: String, // Formato "HH:MM"
    required: true,
  },
  ativo: {
    type: Boolean,
    default: true
  }
});

// Schema para configuração de um dia específico
const diaConfigSchema = new Schema({
  ativo: {
    type: Boolean,
    default: true
  },
  periodos: [periodoSchema]
});

// Schema principal mantendo o nome "Turno" mas agora com estrutura diferente
const turno = new Schema({
  estabelecimentoId: {
    type: mongoose.Types.ObjectId,
    ref: 'Estabelecimento',
    required: true,
    unique: true // Garantir um documento por estabelecimento
  },
  // Configuração de cada dia da semana como um Map
  dias: {
    type: Map,
    of: diaConfigSchema,
    default: () => {
      const diasDefault = {};
      for (let i = 0; i < 7; i++) {
        diasDefault[i] = {
          ativo: i >= 1 && i <= 5, // Dias úteis ativos por padrão
          periodos: i === 6 ? [ // Sábado tem apenas período da manhã
            { inicio: "08:00", fim: "12:00", ativo: true }
          ] : [ // Outros dias têm dois períodos padrão
            { inicio: "08:00", fim: "12:00", ativo: true },
            { inicio: "13:00", fim: "17:00", ativo: true }
          ]
        };
      }
      return diasDefault;
    }
  },
  dataCadastro: {
    type: Date,
    default: Date.now,
  },
  dataAtualizacao: {
    type: Date,
    default: Date.now,
  }
});

// Índice para consultas eficientes
turno.index({ estabelecimentoId: 1 });

module.exports = mongoose.model('Turno', turno);