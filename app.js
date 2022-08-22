const express = require("express")
const ejs = require("ejs")
const bodyParser = require('body-parser')
const mysql = require("mysql")
const session = require("express-session")
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { application } = require("express")
var flash = require('connect-flash')


/**
 * The steps below (createConnection) are required to connect to a database in PHPMyAdmin
 */
mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "node_project"
})

// ------------------------------

var cart = [];
var total = "";
const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({secret:"secret"})); //Default Value
app.use(flash());

//To render the homepage
app.get("/", function(req,res){
    if (req.session.loggedin && req.session.user){
        res.render('pages/index');
    } else {
        res.redirect('/login')
    }
})

//To render the about page
app.get("/about", function(req,res){
    if (req.session.loggedin && req.session.user){
    res.render('pages/about');
    }
})
//To render the contact page
app.get("/contact", function(req,res){
    if (req.session.loggedin && req.session.user){
    res.render('pages/contact');
    }
})

//To Logout the user
app.get('/logout', (req,res)=>{
    req.session.destroy();
    res.redirect('/login');
})

//to check if the product is in the cart or not. If yes the output returns true, else it returns false
function isProductInCart(cart,id){
   
    for(var i=0; i<cart.length; i++){
       if(cart[i].id == id){
          return true;
       }
    }
 
    return false;
 
 };
 


 function calculateTotal(cart,req){
    total = 0;
    for(var i=0; i<cart.length; i++){
       //if we're offering a discounted price
       if(cart[i].sale_price){
          total = total + (cart[i].sale_price*cart[i].quantity);
       }else{
          total = total + (cart[i].price*cart[i].quantity)
       }
    }
    req.session.total = total;
    return total;
 
 };


//To render the products page with db connection
app.get("/products", function(req,res){
    if (req.session.loggedin && req.session.user){

    var connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "node_project"
    })
    connection.query("SELECT * FROM products", (err, result) => {

        res.render('pages/products', {result: result});

    })
}
});

app.post('/add_to_cart',function(req,res){

    var id = req.body.id;
    var name = req.body.name;
    var price = req.body.price;
    var sale_price = req.body.sale_price;
    var quantity = req.body.quantity;
    var image = req.body.image;
    var product = {id:id,name:name,price:price,sale_price:sale_price,quantity:quantity,image:image};
 
 
    if(req.session.cart){
          var cart = req.session.cart;
 
          if(!isProductInCart(cart,id)){
             cart.push(product);
          }
    }else{//If the product is not in the cart, we need to add the product into the array
 
       req.session.cart = [product]
       var cart = req.session.cart;
 
    }
 
 
    //calculate total
    calculateTotal(cart,req);
 
    //return to cart page
    res.redirect('/cart');
 
 });
 

 app.get('/cart',function(req,res){
    if (req.session.loggedin && req.session.user){

    var cart = req.session.cart;
    var total = req.session.total;
 
    res.render('pages/cart',{cart:cart,total:total});
 
    }
 
 });


//Syntax to remove a product from the cart
app.post('/remove_product',function(req,res){

    var id = req.body.id;
    var cart = req.session.cart;
 
    for(var i=0; i<cart.length; i++){
       if(cart[i].id == id){
          cart.splice(cart.indexOf(i),1);
       }
    }
 
    //re-calculate
    calculateTotal(cart,req);
    res.redirect('/cart');
 
 });

//To increase and decrease the product quantity in cart page
app.post('/edit_product_quantity',function(req,res){

    //get values from inputs
    var id = req.body.id;
    var quantity = req.body.quantity;
    var increase_btn = req.body.increase_product_quantity;
    var decrease_btn = req.body.decrease_product_quantity;
 
    var cart = req.session.cart;
 
    if(increase_btn){
       for(var i=0; i<cart.length; i++){
          if(cart[i].id == id){
             if(cart[i].quantity > 0){
                cart[i].quantity = parseInt(cart[i].quantity)+1;
             }
          }
       }
    }
 
    if(decrease_btn){
       for(var i=0; i<cart.length; i++){
          if(cart[i].id == id){
             if(cart[i].quantity > 1){
                cart[i].quantity = parseInt(cart[i].quantity)-1;
             }
          }
       }
    }
 
 
 
    calculateTotal(cart,req);
    res.redirect('/cart')
 
 
 });

 //to render the checkout page
 app.get('/checkout',function(req,res){
    if (req.session.loggedin && req.session.user){
    var total = req.session.total
    res.render('pages/checkout',{total:total})
    }
 })

 app.post('/place_order', function(req,res){
    var name = req.body.name;
    var email = req.body.email;
    var address = req.body.address;
    var phone = req.body.phone;
    var city = req.body.city;
    var postcode = req.body.postcode;
    var county = req.body.county;
    var cost = req.session.total;
    var status = "not paid";
    var date = new Date();
    var products_ids = "";
    var id = Date.now();
    req.session.order_id = id;

    var connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "node_project"
    })

    var cart = req.session.cart;
    for(let i=0; i<cart.length; i++){
    products_ids = products_ids + "," + cart[i].id;
   }

    connection.connect((err)=>{
        if (err){
            console.log("Error Connecting to the database")
        } else {
            var query = "INSERT INTO orders (id,cost,name,email,status,city,address,phone,postcode,county,date,products_ids) VALUES ?";
            var values = [
                [id,cost,name,email,status,city,address,phone,postcode,county,date,products_ids]
            ];

            connection.query(query,[values],(err,result)=>{

                for(let i=0;i<cart.length;i++){
                   var query = "INSERT INTO order_items (order_id,product_id,product_name,product_price,product_sale_price,product_image,product_quantity,order_date) VALUES ?";
                   var values = [
                      [id,cart[i].id,cart[i].name,cart[i].price,cart[i].sale_price,cart[i].image,cart[i].quantity,new Date()]
                   ];
                   connection.query(query,[values],(err,result)=>{})
                }
                res.redirect('/payment') 
             })
          }
       })
    })

    //To render the payments page
 app.get('/payment', function(req,res){
    if (req.session.loggedin && req.session.user){
    var total = req.session.total;
    res.render('pages/payment', {total:total});
    }
 })

 app.get('/verify_payment', function(req,res){
    if (req.session.loggedin && req.session.user){
    var transaction_id = req.query.transaction_id;
    var order_id = req.session.order_id;

    var connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "node_project"
    })

    connection.connect((err)=>{
        if(err){
           console.log(err);
        }else{
           var query = "INSERT INTO payments (order_id,transaction_id,date) VALUES ?";
           var values = [
              [order_id,transaction_id,new Date()]
           ]
           connection.query(query,[values],(err,result)=>{
              
              connection.query("UPDATE orders SET status='paid' WHERE id='"+order_id+"'",(err,result)=>{})
              res.redirect('/thankyou')
           
           })
        }  
  })   
}

})



 app.get('/thankyou', function(req,res){
    if (req.session.loggedin && req.session.user){
    var order_id = req.session.order_id;
    res.render('pages/thankyou', {order_id:order_id})
    }
 })

 app.post('/send_request', function(req,res){
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var email = req.body.email;
    var message = req.body.message;

var connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "node_project"
})

  
connection.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
    var sql = "INSERT INTO queries (firstname,lastname,email,message) VALUES ?";
    var values = [
     [firstname,lastname,email,message]
    ];
    connection.query(sql, [values], function (err, result) {
      if (err) throw err;
      console.log("Number of records inserted: " + result.affectedRows);
      res.redirect('/thankyou_query')
    });
  });
 })


 app.get('/thankyou_query', function(req,res){
    if (req.session.loggedin && req.session.user){
    res.render('pages/thankyou_query')
    }
 })


 //  To render the Register Page
 app.get('/register', function(req,res){
    res.render('pages/register', { message: req.flash('message') })
 })

 app.post('/register_user', function(req,res){
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const con_password = req.body.con_password;


     var connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "node_project"
    })

    connection.query('SELECT email from users WHERE email = ?', [email], async (error,results) => {
        if(error){
            console.log(error);
        }

        if (results.length > 0){
            req.flash('message', 'Email already in use')
            return res.redirect('/register')
        } else if (password !== con_password){
            req.flash('message', 'Passwords do not match')
            return res.redirect('/register');
        }

        let hashedPassword = await bcrypt.hash(password, 8);
        console.log(hashedPassword)

        connection.query('INSERT INTO users SET ?', {name: name, email: email, password: hashedPassword}, (error,results) => {
            if (error){
                console.log(error)
            } else {
                console.log(results)
                return res.redirect('/login');
            }
        })

    }); 
 })

 //  To render the login Page
 app.get('/login', function(req,res){
    res.render('pages/login', { message: req.flash('message')})
 })


app.post('/login_user', async (req,res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;

        var connection = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "",
            database: "node_project"
        })

        if (!email || !password) {
            req.flash('message', 'Invalid Entry ! Please login using your Email & Password')
            return res.redirect('/login')
        }

        connection.query('SELECT * FROM users WHERE email = ?', [email], async (error,results) => {
            if (error) {
                console.log(error);
            }
            if (!results || !(await bcrypt.compare(password,results[0].password))){
                req.flash('message', 'Invalid Credentials, Please check your Email or Password')
                return res.redirect('/login');
            }
        })
        req.session.loggedin = true;
        req.session.user = req.body.email;
        return res.redirect('/')
    } catch (error) {
        console.log(error);
    }

})


app.listen(3000, function(req,res){
    console.log("Port succesfully connected");
})