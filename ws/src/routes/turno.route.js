const express = require('express');
const router = express.Router();
const Turno = require('../models/turno');
const moment = require('moment');

// Obter todos os turnos de um estabelecimento
router.get('/estabelecimento/:estabelecimentoId', async (req, res) => {
  try {
    const { estabelecimentoId } = req.params;
    
    // Buscar a configuração existente ou criar uma nova
    let turno = await Turno.findOne({ estabelecimentoId });
    
    if (!turno) {
      // Criar uma nova configuração com valores padrão
      turno = new Turno({ estabelecimentoId });
      await turno.save();
    }
    
    // Formatar para o frontend 
    const turnosPorDia = {};
    
    // Percorrer todos os dias (0-6)
    for (let i = 0; i < 7; i++) {
      const diaConfig = turno.dias.get(String(i)) || {
        ativo: false,
        periodos: []
      };
      
      turnosPorDia[i] = {
        ativo: diaConfig.ativo,
        periodos: diaConfig.periodos.map(p => ({
          inicio: p.inicio,
          fim: p.fim,
          ativo: p.ativo,
          _id: p._id
        }))
      };
    }
    
    res.json({ error: false, turnos: turnosPorDia });
  } catch (err) {
    console.error('Erro ao buscar turnos:', err);
    res.json({ error: true, message: err.message });
  }
});

// Configurar turnos de um estabelecimento
router.post('/configurar', async (req, res) => {
  try {
    const { estabelecimentoId, turnos } = req.body;
    
    if (!estabelecimentoId || !turnos || typeof turnos !== 'object') {
      return res.json({ 
        error: true, 
        message: 'Dados inválidos. Forneça o estabelecimentoId e os turnos configurados.' 
      });
    }
    
    // Buscar ou criar o documento de turno para este estabelecimento
    let turno = await Turno.findOne({ estabelecimentoId });
    
    if (!turno) {
      turno = new Turno({ estabelecimentoId });
    }
    
    // Atualizar configuração de cada dia
    for (let dia = 0; dia < 7; dia++) {
      if (turnos[dia]) {
        turno.dias.set(String(dia), {
          ativo: !!turnos[dia].ativo,
          periodos: Array.isArray(turnos[dia].periodos) 
            ? turnos[dia].periodos.map(p => ({
                inicio: p.inicio,
                fim: p.fim,
                ativo: !!p.ativo
              }))
            : []
        });
      }
    }
    
    turno.dataAtualizacao = Date.now();
    await turno.save();
    
    res.json({
      error: false,
      message: 'Turnos configurados com sucesso!'
    });
  } catch (err) {
    console.error('Erro ao configurar turnos:', err);
    res.json({ error: true, message: err.message });
  }
});

// Ativar/desativar um dia inteiro
router.put('/dia-status/:estabelecimentoId/:diaSemana', async (req, res) => {
  try {
    const { estabelecimentoId, diaSemana } = req.params;
    const { ativo } = req.body;
    const diaInt = parseInt(diaSemana);
    
    // Validar os parâmetros
    if (isNaN(diaInt) || diaInt < 0 || diaInt > 6) {
      return res.json({ 
        error: true, 
        message: 'Dia da semana inválido. Use 0 (Domingo) a 6 (Sábado).' 
      });
    }
    
    if (typeof ativo !== 'boolean') {
      return res.json({ 
        error: true, 
        message: 'Status inválido. Use true para ativo ou false para inativo.' 
      });
    }
    
    // Buscar ou criar documento
    let turno = await Turno.findOne({ estabelecimentoId });
    if (!turno) {
      turno = new Turno({ estabelecimentoId });
    }
    
    // Obter configuração atual do dia
    const diaConfig = turno.dias.get(String(diaInt)) || {
      ativo: false,
      periodos: []
    };
    
    // Atualizar status
    diaConfig.ativo = ativo;
    
    // Se estiver ativando e não tiver períodos, adicionar padrão
    if (ativo && (!diaConfig.periodos || diaConfig.periodos.length === 0)) {
      diaConfig.periodos = [
        { inicio: "08:00", fim: "12:00", ativo: true },
        { inicio: "13:00", fim: "17:00", ativo: true }
      ];
    }
    
    // Salvar alteração
    turno.dias.set(String(diaInt), diaConfig);
    turno.dataAtualizacao = Date.now();
    await turno.save();
    
    res.json({
      error: false,
      message: `Dia ${ativo ? 'ativado' : 'desativado'} com sucesso`,
      turno: {
        diaSemana: diaInt,
        ativo: diaConfig.ativo,
        periodos: diaConfig.periodos
      }
    });
  } catch (err) {
    console.error('Erro ao alterar status do dia:', err);
    res.json({ error: true, message: err.message });
  }
});

// Adicionar um período a um dia
router.post('/adicionar-periodo/:estabelecimentoId/:diaSemana', async (req, res) => {
  try {
    const { estabelecimentoId, diaSemana } = req.params;
    const { inicio, fim } = req.body;
    const diaInt = parseInt(diaSemana);
    
    // Validar os parâmetros
    if (isNaN(diaInt) || diaInt < 0 || diaInt > 6) {
      return res.json({ 
        error: true, 
        message: 'Dia da semana inválido. Use 0 (Domingo) a 6 (Sábado).' 
      });
    }
    
    if (!inicio || !fim) {
      return res.json({
        error: true,
        message: 'Horários de início e fim são obrigatórios'
      });
    }
    
    // Buscar ou criar documento
    let turno = await Turno.findOne({ estabelecimentoId });
    if (!turno) {
      turno = new Turno({ estabelecimentoId });
    }
    
    // Obter configuração atual do dia
    let diaConfig = turno.dias.get(String(diaInt));
    if (!diaConfig) {
      diaConfig = {
        ativo: true,
        periodos: []
      };
    }
    
    // Adicionar o novo período
    diaConfig.periodos.push({
      inicio,
      fim,
      ativo: true
    });
    
    // Atualizar documento
    turno.dias.set(String(diaInt), diaConfig);
    turno.dataAtualizacao = Date.now();
    await turno.save();
    
    res.json({
      error: false,
      message: 'Período adicionado com sucesso',
      turno: {
        diaSemana: diaInt,
        ativo: diaConfig.ativo,
        periodos: diaConfig.periodos
      }
    });
  } catch (err) {
    console.error('Erro ao adicionar período:', err);
    res.json({ error: true, message: err.message });
  }
});

// Remover um período de um dia
router.delete('/remover-periodo/:estabelecimentoId/:diaSemana/:periodoId', async (req, res) => {
  try {
    const { estabelecimentoId, diaSemana, periodoId } = req.params;
    const diaInt = parseInt(diaSemana);
    
    // Validar os parâmetros
    if (isNaN(diaInt) || diaInt < 0 || diaInt > 6) {
      return res.json({ 
        error: true, 
        message: 'Dia da semana inválido. Use 0 (Domingo) a 6 (Sábado).' 
      });
    }
    
    // Buscar documento
    const turno = await Turno.findOne({ estabelecimentoId });
    if (!turno) {
      return res.json({
        error: true,
        message: 'Configuração de turno não encontrada'
      });
    }
    
    // Obter configuração do dia
    const diaConfig = turno.dias.get(String(diaInt));
    if (!diaConfig) {
      return res.json({
        error: true,
        message: 'Configuração para este dia não encontrada'
      });
    }
    
    // Verificar se há períodos suficientes
    if (!diaConfig.periodos || diaConfig.periodos.length <= 1) {
      return res.json({
        error: true,
        message: 'Não é possível remover o único período disponível'
      });
    }
    
    // Filtrar o período a ser removido
    diaConfig.periodos = diaConfig.periodos.filter(
      p => p._id.toString() !== periodoId
    );
    
    // Atualizar documento
    turno.dias.set(String(diaInt), diaConfig);
    turno.dataAtualizacao = Date.now();
    await turno.save();
    
    res.json({
      error: false,
      message: 'Período removido com sucesso',
      turno: {
        diaSemana: diaInt,
        ativo: diaConfig.ativo,
        periodos: diaConfig.periodos
      }
    });
  } catch (err) {
    console.error('Erro ao remover período:', err);
    res.json({ error: true, message: err.message });
  }
});

// Função para migrar dados existentes para o novo formato
router.post('/migrar/:estabelecimentoId', async (req, res) => {
  try {
    const { estabelecimentoId } = req.params;
    
    // Verificar se já existe um documento no novo formato
    const turnoExistente = await Turno.findOne({ 
      estabelecimentoId,
      dias: { $exists: true } // Usando o campo 'dias' para identificar novos documentos
    });
    
    if (turnoExistente) {
      return res.json({
        error: false,
        message: 'Migração já realizada para este estabelecimento',
        turno: turnoExistente
      });
    }
    
    // Buscar todos os turnos no formato antigo para este estabelecimento
    const turnosAntigos = await Turno.find({ 
      estabelecimentoId,
      diaSemana: { $exists: true } // Usando o campo 'diaSemana' para identificar documentos antigos
    });
    
    if (turnosAntigos.length === 0) {
      // Se não houver documentos antigos, criar um novo no formato atualizado
      const novoTurno = new Turno({ estabelecimentoId });
      await novoTurno.save();
      
      return res.json({
        error: false,
        message: 'Nenhum turno encontrado para migração. Criado novo documento.',
        turno: novoTurno
      });
    }
    
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
    await Turno.deleteMany({ 
      estabelecimentoId, 
      diaSemana: { $exists: true }
    });
    
    res.json({
      error: false,
      message: 'Migração concluída com sucesso',
      turno: novoTurno
    });
  } catch (err) {
    console.error('Erro durante migração:', err);
    res.json({ error: true, message: err.message });
  }
});

// Excluir todas as configurações de um estabelecimento
router.delete('/estabelecimento/:estabelecimentoId', async (req, res) => {
  try {
    const { estabelecimentoId } = req.params;
    await Turno.deleteMany({ estabelecimentoId });
    res.json({ 
      error: false, 
      message: "Todas as configurações de turno foram excluídas com sucesso!" 
    });
  } catch (err) {
    console.error('Erro ao excluir configurações de turno:', err);
    res.json({ error: true, message: err.message });
  }
});

module.exports = router;