moment = require('moment');

module.exports = {
    DURACAO_SERVICO:15,

    horaParaMinutos: (horaMinuto) => {
        
        
        const [hora, minuto] = horaMinuto.split(':');
        return parseInt(parseInt(hora)*60 + parseInt(minuto));
        
    },

    partesMinutos: (inicio, fim, duracao) => {
      const partes = [];
      inicio = moment(inicio);
      fim = moment(fim);
      while (inicio.clone().add(duracao, 'minutes') <= fim) {
          partes.push(inicio.format('HH:mm'));
          inicio = inicio.add(duracao, 'minutes');
      }
      return partes;
  },
  

    horariosDoDia: (data, hora) => {
        // Properly parse the time string using a specific format
        // hora is expected to be in "HH:MM" format (e.g., "08:00")
        const formattedDate = moment(data).format('YYYY-MM-DD');
        return moment(`${formattedDate} ${hora}`, 'YYYY-MM-DD HH:mm');
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