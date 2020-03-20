const request = require("request-promise");
const cheerio = require("cheerio");
var cookieJar = request.jar();

function search(config) {
  //this searches for an item based on keywords and size
  console.log("[shopify bot] searching for item");
  var finalstraw = false;
  if (finalstraw == true) {
    return;
  }

  var returnstock;
  var keywordarr = config.keywords.split(",");
  var poskey = [];
  var negkey = [];
  var matchkey = [];
  for (var x = 0; x < keywordarr.length; x++) {
    if (keywordarr[x].includes("+")) {
      poskey.push(keywordarr[x].replace("+", ""));
    } else if (keywordarr[x].includes("-")) {
      negkey.push(keywordarr[x].replace("-", ""));
    }
  }
  returnstock = "undefined";
  var mainurl;
  if (config.domain.startsWith("http") == true) {
    if (config.domain.endsWith("/") == true) {
      mainurl = `${config.domain}products.json`;
    } else {
      mainurl = `${config.domain}/products.json`;
    }
  } else {
    if (config.taskurl.endsWith("/") == true) {
      mainurl = `https://${config.domain}products.json`;
    } else {
      mainurl = `https://${config.domain}/products.json`;
    }
  }
  let pingUrl = mainurl;

  const opts = {
    method: "GET",
    uri: pingUrl,

    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) app2leWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36"
    },
    gzip: true,
    json: true,
    simple: false
  };

  request(opts).then(
    function(data) {
      var jsonObject = data;
      prods = [];
      if (data == undefined) {
        console.log("dang");
        return;
      }
      if (jsonObject == undefined || jsonObject == "undefined") {
        console.log("dang 2");
        return;
      }

      var started = false;
      for (var x = 0; x < jsonObject.products.length; x++) {
        var item = jsonObject.products[x];
        prods.push({
          name: item.title,
          images: item.images,
          variants: item.variants
        });
      }

      for (var i = 0; i < prods.length; i++) {
        var matches = 0;
        for (var ix = 0; ix < poskey.length; ix++) {
          if (prods[i].name.toLowerCase().includes(poskey[ix].toLowerCase())) {
            matches = matches + 1;
          }
        }
        matchkey.push({ index: i, matches: matches });
      }

      matchkey = matchkey.sort((a, b) => b.matches - a.matches);

      if (matchkey[0]) {
        if (prods[matchkey[0].index]) {
          for (
            var ii = 0;
            ii < prods[matchkey[0].index].variants.length;
            ii++
          ) {
            if (
              prods[matchkey[0].index].variants[ii].available == true &&
              poskey.length == matchkey[0].matches
            ) {
              if (
                prods[matchkey[0].index].variants[ii].title
                  .toLowerCase()
                  .includes(config.size.toLowerCase())
              ) {
                var url =
                  pingUrl.replace("products.json", "") +
                  "cart/" +
                  prods[matchkey[0].index].variants[ii].id +
                  ":1";
                returnitem = {
                  name: prods[matchkey[0].index].name,
                  variant: prods[matchkey[0].index].variants[ii].title,
                  keywords: config.keywords
                };
                returnstock = prods[matchkey[0].index].variants[ii].id;
                break;
              } else if (config.size.toLowerCase().includes("one size")) {
                var itemId = prods[matchkey[0].index].variants[ii].id;
                returnitem = {
                  name: prods[matchkey[0].index].name,
                  variant: prods[matchkey[0].index].variants[ii].title,
                  keywords: config.keywords
                };
                returnstock = itemId;
                break;
              }
            }
          }
        }
      }
      function restart() {
        search(config);
      }
      if (returnstock == "undefined") {
        var statt = "";
        if (statt == "Stopped") {
          return;
        } else if (statt != "Stopped") {
          setTimeout(restart, 4000);
        }
      } else {
        checkout(config.domain, returnstock);
      }
    },
    function(error) {
      setTimeout(function() {
        search(config);
      }, 3000);
    }
  );
}
function checkout(domain, id) {
  console.log(
    "[shopify bot] checking out item with ID: " + id + " on domain " + domain
  );

  request(
    {
      uri: `${domain}/cart/add.js`,
      method: "post",
      jar: cookieJar,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
      },
      formData: {
        id: id,
        quantity: "1"
      }
    },
    function() {
      grabCart("kith.com");
    }
  );
}
function submitDetails(checkout) {
  request.get(
    {
      uri: checkout,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
      },
      jar: cookieJar
    },
    function(e, r, b) {
      var $ = cheerio.load(b);
      var authToken = $($('input[name="authenticity_token"]')[0]).attr("value");
      request.post(
        {
          uri: checkout,

          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
          },
          jar: cookieJar,
          followAllRedirects: true,
          formData: {
            _method: "patch",
            authenticity_token: authToken,
            previous_step: "contact_information",
            step: "shipping_method",
            "checkout[email]": "jamespeach@gmail.com",
            "checkout[buyer_accepts_marketing]": 1,
            "checkout[shipping_address][first_name]": "james",
            "checkout[shipping_address][last_name]": "peach",
            "checkout[shipping_address][address1]": "123 lol st",
            "checkout[shipping_address][address2]": "building #2",
            "checkout[shipping_address][city]": "city",
            "checkout[shipping_address][country]": "United States",
            "checkout[shipping_address][province]": "NY",
            "checkout[shipping_address][zip]": "11111",
            "checkout[shipping_address][phone]": "(860) 111-1111",
            "checkout[client_details][browser_width]": 960,
            "checkout[client_details][browser_height]": 969,
            "checkout[client_details][color_depth]": 24
          }
        },
        function(e, r, b) {
          //this next part creates a shipping rate
          var zip = "11111";
          var state = "NY";
          request.get(
            {
              uri: `https://kith.com/cart/shipping_rates.json?shipping_address%5Bzip%5D=${zip}&shipping_address%5Bcountry%5D=US&shipping_address%5Bprovince%5D=${state}`,
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
              },
              jar: cookieJar
            },
            function(e, r, b) {
              $ = cheerio.load(b);
              var resObj = JSON.parse(b);
              var finalShip =
                "shopify-" +
                resObj.shipping_rates[0].name.replace(/ /g, "%20") +
                "-" +
                resObj.shipping_rates[0].price;
              console.log("[shopify bot] shipping id is: " + finalShip);
              //this submits our shipping
              request.post(
                {
                  uri: checkout,
                  headers: {
                    "User-Agent":
                      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
                  },
                  jar: cookieJar,
                  followAllRedirects: true,
                  formData: {
                    _method: "patch",
                    authenticity_token: authToken,
                    previous_step: "shipping_method",
                    step: "payment_method",
                    "checkout[shipping_rate][id]": finalShip,
                    "checkout[client_details][browser_width]": 226,
                    "checkout[client_details][browser_height]": 969,
                    "checkout[client_details][javascript_enabled]": 1,
                    "checkout[client_details][color_depth]": 24,
                    "checkout[client_details][java_enabled]": 0,
                    "checkout[client_details][browser_tz]": 240
                  }
                },
                function(e, r, b) {
                  //this is for 'depositing' our card details
                  request
                    .post(
                      {
                        uri: "https://deposit.us.shopifycs.com/sessions",
                        headers: {
                          "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36",
                          "Content-Type": "application/json"
                        },
                        jar: cookieJar,

                        body:
                          '{"credit_card":{"number":"4242 4242 4242 4242","name":"wewe qweqwe","month":12,"year":2022,"verification_value":"223"}}'
                      },
                      function(e, r, b) {
                        request.post(
                          {
                            uri: checkout,
                            headers: {
                              "User-Agent":
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
                            },
                            jar: cookieJar,
                            followAllRedirects: true,
                            formData: {
                              _method: "patch",
                              authenticity_token: authToken,
                              previous_step: "payment_method",
                              step: "",
                              s: JSON.parse(b).id,
                              "checkout[payment_gateway]": 128707719,
                              "checkout[credit_card][vault]": 0,
                              "checkout[different_billing_address]": 0,
                              "checkout[remember_me]": 0,
                              "checkout[remember_me]": 0,
                              complete: 1,
                              "checkout[client_details][browser_width]": 943,
                              "checkout[client_details][browser_height]": 969,
                              "checkout[client_details][javascript_enabled]": 1,
                              "checkout[client_details][color_depth]": 24,
                              "checkout[client_details][java_enabled]": 0,
                              "checkout[client_details][browser_tz]": 240
                            }
                          },
                          function(e, r, b) {
                            var $ = cheerio.load(b);
                            if ($(".notice__text").text() != "") {
                              console.log(
                                "[shopify bot] payment error: " +
                                  $(".notice__text").text()
                              );
                            }
                            if ($('input[name="step"]').val() == "processing") {
                              console.log("[shopify bot] sent order details");
                            }
                          }
                        );
                      }
                    )
                    .catch(() => {});
                }
              );
            }
          );
        }
      );
    }
  );
}
function startCheckout(domain) {
  request(
    {
      uri: `https://${domain}/cart/checkout`,
      method: "GET",
      followAllRedirects: true,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
      },
      jar: cookieJar
    },
    function(e, r, b) {
      var chkoutUrl = r.request._redirect.redirects[0].redirectUri;
      console.log("[shopify bot] checkout url is: " + chkoutUrl);
      submitDetails(chkoutUrl);
    }
  );
}
function grabCart(domain) {
  request(
    {
      uri: `https://${domain}/cart.js`,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36"
      },
      jar: cookieJar
    },
    function(e, r, b) {
      var rez = JSON.parse(b);
      console.log("[shopify bot] item in cart: " + rez.items[0].title);
      startCheckout("kith.com");
    }
  );
}
function mainFunc() {
  console.log("[shopify bot] welcome");
  //start search
  search({
    domain: "https://kith.com/",
    keywords: "+Converse,+CPX70,+High",
    size: "5"
  });
}
mainFunc();
