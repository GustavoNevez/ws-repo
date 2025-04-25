/**
 * Script para migrar todos os estabelecimentos do formato antigo para o novo
 * como executar: node migrateSchedules.js
 */

const mongoose = require('mongoose');
const config = require('../config/auth.json');

// Conectar ao MongoDB
mongoose.connect(config.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB conectado...'))
.catch(err => {
  console.error('Erro ao conectar ao MongoDB:', err);
  process.exit(1);
});

// Import model
const Turno = require('../models/turno');
const Estabelecimento = require('../models/estabelecimento');

// Função principal de migração
async function migrateAllEstablishments() {
  try {
    console.log('Iniciando migração de turnos para todos estabelecimentos...');
    
    // Obter todos os estabelecimentos
    const estabelecimentos = await Estabelecimento.find({});
    console.log(`Encontrados ${estabelecimentos.length} estabelecimentos`);
    
    // Para cada estabelecimento, executar a migração
    for (const estabelecimento of estabelecimentos) {
      await migrateEstablishment(estabelecimento._id);
    }
    
    console.log('Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro durante migração:', error);
    process.exit(1);
  }
}

// Função para migrar um estabelecimento específico
async function migrateEstablishment(estabelecimentoId) {
  try {
    console.log(`Migrando turnos para estabelecimento ${estabelecimentoId}...`);
    
    // Verificar se já existe um documento no novo formato
    const turnoExistente = await Turno.findOne({ 
      estabelecimentoId,
      dias: { $exists: true } // Usando o campo 'dias' para identificar novos documentos
    });
    
    if (turnoExistente) {
      console.log(`Estabelecimento ${estabelecimentoId} já foi migrado.`);
      return;
    }
    
    // Buscar todos os turnos no formato antigo para este estabelecimento
    const turnosAntigos = await Turno.find({ 
      estabelecimentoId,
      diaSemana: { $exists: true } // Usando o campo 'diaSemana' para identificar documentos antigos
    });
    
    if (turnosAntigos.length === 0) {
      console.log(`Nenhum turno encontrado para o estabelecimento ${estabelecimentoId}. Criando padrão.`);
      // Se não houver documentos antigos, criar um novo no formato atualizado
      const novoTurno = new Turno({ estabelecimentoId });
      await novoTurno.save();
      return;
    }
    
    console.log(`Encontrados ${turnosAntigos.length} turnos para migrar.`);
    
    // Criar novo documento consolidado
    const novoTurno = new Turno({ estabelecimentoId });
    
    // Inicializar dias
    for (let i = 0; i < 7; i++) {
      novoTurno.dias.set(String(i), {
        ativo: false,
        periodos: []
      });
    }
    
    // Preencher com dados dos documentos existentes
    for (const turnoAntigo of turnosAntigos) {
      for (const dia of turnoAntigo.diaSemana) {
        novoTurno.dias.set(String(dia), {
          ativo: turnoAntigo.ativo,
          periodos: turnoAntigo.periodos.map(periodo => ({
            inicio: periodo.inicio,
            fim: periodo.fim,
            ativo: periodo.ativo
          }))
        });
      }
    }
    
    // Salvar novo documento
    await novoTurno.save();
    
    // Remover documentos antigos
    const resultadoDelete = await Turno.deleteMany({ 
      estabelecimentoId, 
      diaSemana: { $exists: true },
      _id: { $ne: novoTurno._id }
    });
    
    console.log(`Estabelecimento ${estabelecimentoId} migrado com sucesso. Removidos ${resultadoDelete.deletedCount} documentos antigos.`);
  } catch (error) {
    console.error(`Erro ao migrar estabelecimento ${estabelecimentoId}:`, error);
  }
}

// Executar a migração
migrateAllEstablishments();