require('./src/database');

const express = require('express');
const app = express();
const morgan = require('morgan');
const cors = require('cors');


require("dotenv").config()



app.use(morgan('dev'));
app.use(express.json());
const authenticateMiddleware = require("./src/middlewares/authenticate");


app.use(cors());


const port = process.env.PORT;




app.use('/estabelecimento',authenticateMiddleware,require('./src/routes/estabelecimento.route'));
app.use('/servico',authenticateMiddleware, require('./src/routes/servico.route'));
app.use('/horario',authenticateMiddleware, require('./src/routes/horario.route'));
app.use('/agendamento',authenticateMiddleware, require('./src/routes/agendamento.route'));
app.use('/cliente',authenticateMiddleware, require('./src/routes/cliente.route'));
app.use('/auth', require('./src/controllers/authController'));



app.listen(port, () => {
    console.log(`WS Na porta: ${port}`);
});