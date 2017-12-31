var express = require('express');
var bodyParser = require('body-parser')

var coinbase = require('coinbase');
var Client = coinbase.Client;
var client = new Client({'apiKey': '__', 'apiSecret': '__'});
var moment = require("moment");
var https = require('https');

var accountIDs = ['__', '__']

// var accountIDs = []
//
// client.getAccounts({}, (err, accounts) => {
//   if (err) console.log(err)
//   accounts.forEach((acct) => {
//     client.getAccount(acct.id, function(err, account) {
//       accountIDs.push({'currency': account.balance.currency, 'id': account.id})
//       // accountIDs[account.balance.currency] = account.id
//       // console.log('currency: ', account.balance.currency, 'id: ',account.id);
//       console.log(accountIDs)
//     });
//     // console.log(accountIDs)
//   })
// });
// // console.log(accountIDs)



var bal = [];
// given ID retrieve transactions
var getTxs = id => {
  // async stuff https://stackoverflow.com/questions/14220321/how-do-i-return-the-response-from-an-asynchronous-call
  return new Promise((resolve, reject) => {
    var final_txns = []
    client.getAccount(id, (err, account) => {
      if (err) console.log(err)
      account.getTransactions(null, (err, txs, pagination) => {
        if (err) console.log(err)
        txs.forEach((tx)=>{
          final_txns.push(tx);
        })
        account.getTransactions(pagination, (err, txs) => {
          if (err) console.log(err)
          txs.forEach((tx)=>{
            final_txns.push(tx);
          })
          resolve(final_txns)
        });
      });

    });
  })
}

var updateBuy = (date, amount, coin) => {
  bal.forEach((day) => {
    if (day.date >= new Date(date))
    {
        Object.assign(bal, day.coin_bal = parseFloat(day.coin_bal) + parseFloat(coin),
          day.currency_in = parseFloat(day.currency_out) + parseFloat(amount));
    }
  })
}

var updateSell = (date, amount, coin) => {
  bal.forEach((day) => {
    if (day.date >= new Date(date))
    {
        Object.assign(bal, day.coin_bal = parseFloat(day.coin_bal) + parseFloat(coin),
          day.currency_in = parseFloat(day.currency_in) - parseFloat(amount));
    }
  })
}

var updateSend = (date, amount, coin) => {
  bal.forEach((day) => {
    if (day.date >= new Date(date))
    {
        Object.assign(bal, day.coin_bal = parseFloat(day.coin_bal) + parseFloat(coin),
          day.currency_out = parseFloat(day.currency_out) - parseFloat(amount));
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
var pAndL = currency => {
  var id = '';

  // get account ID given desired currency
  if (currency == 'BTC') {
     id = accountIDs[0]
  } else if (currency == 'ETH') {
    id = accountIDs[1]
  }

  console.log(id)

  return new Promise((resolve, reject) => {
    getTxs(id).then(txs => {
      var len = Object.keys(txs).length;
      var start = new Date(txs[len-1].account.created_at);
      var end = new Date()-1;

      // create obj of objs for every day between account creation and today
      var dates = getDates(start, end);

      // get price info for every day from start to today - 1 (since it only gets end of day data)
      var url = [
        'https://api.coindesk.com/v1/bpi/historical/close.json?start=',
        moment(start).format("YYYY-MM-DD"),
        '&end=',
        moment(end).format("YYYY-MM-DD")
      ]

      // var prices = Object.values(Object.values([]))

      https.get(url.join(''), res => {
        res.setEncoding("utf8");
        let body = "";
        res.on("data", data => {
          body += data;
        });
        res.on("end", () => {
          body = JSON.parse(body);

          prices = Object.values(Object.values(body)[0]);

          for (var i = 0; i<=dates.length; i++) {
            bal.push({'date': dates[i], 'price': prices[i], 'coin_bal': 0, 'currency_in': 0, 'currency_out': 0});
          }

        });
      });

      // dates.forEach(date => {
      //   bal.push({'date': date, 'coin_bal': 0, 'currency_in': 0, 'currency_out': 0});
      // })

      // for every element of tx, add/subtract from bal depending on transaction type
      for (var i = len-1; i > -1; i-=1 ){
        // console.log(txs[i].type, txs[i].created_at,txs[i].native_amount.amount, txs[i].amount.amount)
        switch (txs[i].type) {
          case "buy":
            // console.log('buy', txs[i]);
            updateBuy(txs[i].created_at, txs[i].native_amount.amount, txs[i].amount.amount)
            break;
          case "sell":
            // console.log('sell', txs[i]);
            updateSell(txs[i].created_at, txs[i].native_amount.amount, txs[i].amount.amount)
            break;
          case "send":
            // console.log('sell', txs[i]);
            updateSend(txs[i].created_at, txs[i].native_amount.amount, txs[i].amount.amount)
            break;
          case "receive":
            // console.log('receive', txs[i]);
            updateReceive(txs[i].created_at, txs[i].native_amount.amount, txs[i].amount.amount)
            break;
        }
      }
      // THIS LINE
      // console.log(bal);
      resolve(bal);
    });
    // NOT HERE
  })
}



var dataReformat = (data) => {
  // array of objects with 5 keys to 2 arrays
  var series1 = data.map((entry)=>{

    return [parseInt(moment.utc(entry.date).format('x')), entry.coin_bal]
  })
  var series2 = data.map((entry)=>{
    return [parseInt(moment.utc(entry.date).format('x')),  entry.currency_out - entry.currency_in ]
  })
  var series3 = data.map((entry)=>{
    return [parseInt(moment.utc(entry.date).format('x')), entry.coin_bal *  entry.price]
  })
  return [series1, series2, series3]
}

var app = express();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', async (req, res, next) => {
  try {
    const data = await pAndL('BTC');
    const input = dataReformat(data)
    res.render('home', {
      series1: JSON.stringify(input[0]),
      series2: JSON.stringify(input[1]),
      series3: JSON.stringify(input[2])
    });
  } catch (e) {
    console.log("error")
  }
})

app.post('/', async (req, res) => {
  try {
    console.log(req.body);
    if (req.body.currency=="ETH"){
      const data = await pAndL('ETH');
      const input = dataReformat(data)
      res.render('home', {
        series1: JSON.stringify(input[0]),
        series2: JSON.stringify(input[1]),
        series3: JSON.stringify(input[2])
      });
    }
  } catch (e) {
    console.log("error")
  }
})


app.listen(2999);
