moment = require('moment');

module.exports = {
    DURACAO_SERVICO:30,

    horaParaMinutos: (horaMinuto) => {
        
        
        const [hora, minuto] = horaMinuto.split(':');
        return parseInt(parseInt(hora)*60 + parseInt(minuto));
        
    },

    partesMinutos: (inicio, fim,duracao) => {
        const partes = [];
        let count = 0;
        inicio = moment(inicio);
        fim = moment(fim)     
        while(fim > inicio) {
            partes.push(inicio.format('HH:mm'));
            inicio = inicio.add(duracao, 'minutes');
            count++;
        }
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