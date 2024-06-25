moment = require('moment');

module.exports = {
    DURACAO_SERVICO:30,

    horaParaMinutos: (horaMinuto) => {
        
        
        const [hora, minuto] = horaMinuto.split(':');
        return parseInt(parseInt(hora)*60 + parseInt(minuto));
        
    },

    partesMinutos: (inicio, fim, duracao) => {
      const partes = [];
      inicio = moment(inicio);
      fim = moment(fim);

      console.log('Inicio:', inicio.format('YYYY-MM-DDTHH:mm'));
      console.log('Fim:', fim.format('YYYY-MM-DDTHH:mm'));
      console.log('Duracao:', duracao);

      while (fim > inicio) {
          partes.push(inicio.format('HH:mm'));
          inicio = inicio.add(duracao, 'minutes');
      }

      console.log('Partes:', partes);
      return partes;
  },
    

    horariosDoDia: (data, hora) => {
        const relacao = `${moment(data).format('YYYY-MM-DD')}T${moment(hora).format('HH-mm')}`;
        return relacao
    },

    splitByValue: (array, value) => {
        let newArray = [[]];
        array.forEach((item) => {
          if (item !== value) {
            newArray[newArray.length - 1].push(item);
          } else {
            newArray.push([]);
          }
        });
        return newArray;
      },
};