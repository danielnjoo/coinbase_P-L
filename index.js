var express = require('express');
var coinbase = require('coinbase');
var Client = coinbase.Client;
var client = new Client({'apiKey': '____', 'apiSecret': '_____'});
var moment = require("moment");



var bal = [];
// given ID retrieve transactions
var getTxs = id => {
  // async stuff https://stackoverflow.com/questions/14220321/how-do-i-return-the-response-from-an-asynchronous-call
  return new Promise((resolve, reject) => {
    client.getAccount(id, (err, account) => {
      if (err) console.log(err)
      account.getTransactions(null, (err, txs) => {
        if (err) console.log(err)
        resolve(txs);
      });
    });
  })
}

var updateBuy = (date, amount, coin) => {
  bal.forEach((day) => {
    if (day.date >= new Date(date))
    {
        Object.assign(bal, day.coin_bal = parseFloat(day.coin_bal) + parseFloat(coin),
          day.currency_out = parseFloat(day.currency_out) + parseFloat(amount));
    }
  })
}

var updateSell = (date, amount, coin) => {
  bal.forEach((day) => {
    if (day.date >= new Date(date))
    {
        Object.assign(bal, day.coin_bal = parseFloat(day.coin_bal) + parseFloat(coin),
          day.currency_in = parseFloat(day.currency_in) + parseFloat(amount));
    }
  })
}

var updateSend = (date, amount, coin) => {
  bal.forEach((day) => {
    if (day.date >= new Date(date))
    {
        Object.assign(bal, day.coin_bal = parseFloat(day.coin_bal) + parseFloat(coin),
          day.currency_out = parseFloat(day.currency_out) + parseFloat(amount));
    }
  })
}

var updateReceive = (date, amount, coin) => {
  bal.forEach((day) => {
    if (day.date >= new Date(date))
    {
        Object.assign(bal, day.coin_bal = parseFloat(day.coin_bal) + parseFloat(coin),
          day.currency_in = parseFloat(day.currency_in) + parseFloat(amount));
    }
  })
}

Date.prototype.addDays = function(days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
}

var getDates = (startDate, stopDate) => {
  var result = new Array();
  var currentDate = startDate;
  while (currentDate <= stopDate) {
    result.push(new Date (currentDate));
    currentDate = currentDate.addDays(1);
  }
  return result;
}

// given an account ID, update bal
var pAndL = id => {
  return new Promise((resolve, reject) => {
    getTxs(id).then(txs => {
      var len = Object.keys(txs).length;
      // create obj of objs for every day between account creation and today
      var dates = getDates(new Date(txs[len-1].account.created_at), Date.now())
      dates.forEach(date => {
        bal.push({'date': date, 'coin_bal': 0, 'currency_in': 0, 'currency_out': 0});
      })
      // for every element of tx, add/subtract from bal depending on transaction type
      for (var i = len-1; i > -1; i-=1 ){
        switch (txs[i].type) {
          case "buy":
            updateBuy(txs[i].created_at, txs[i].native_amount.amount, txs[i].amount.amount)
            break;
          case "sell":
            updateSell(txs[i].created_at, txs[i].native_amount.amount, txs[i].amount.amount)
            break;
          case "send":
            updateSend(txs[i].created_at, txs[i].native_amount.amount, txs[i].amount.amount)
            break;
          case "receive":
            updateReceive(txs[i].created_at, txs[i].native_amount.amount, txs[i].amount.amount)
            break;
        }
      }
      // THIS LINE
      resolve(bal);
    });
    // NOT HERE
  })
}

// client.getAccounts({}, (err, accounts) => {
//   if (err) console.log(err)
//   accounts.forEach((acct) => {
//     client.getAccount(acct.id, function(err, account) {
//       // console.log('bal: ' + account.balance.amount + ' currency: ' + account.balance.currency);
//       console.log(account.id);
//     });
//     // if (acct.currency=="BTC")  pAndL(acct.id);
//   })
// });

var dataReformat = (data) => {
  // array of objects with 4 keys to 2 arrays
  var series1 = data.map((entry)=>{
    return [parseInt(moment.utc(entry.date).format('x')), entry.coin_bal]
  })
  var series2 = data.map((entry)=>{
    return [parseInt(moment.utc(entry.date).format('x')),  entry.currency_out - entry.currency_in ]
  })
  return [series1, series2]
}

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', async (req, res, next) => {
  try {
    const data = await pAndL('_____');
    const input = dataReformat(data)
    res.render('home', {series1: JSON.stringify(input[0]), series2: JSON.stringify(input[1])});
  } catch (e) {
    console.log("error")
  }
})


app.listen(2999);
