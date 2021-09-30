const express = require('express')
const app = express()
const expressFileUpload = require('express-fileupload')
const exphbs = require("express-handlebars")
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken')
const secretKey = "1234"


const {
    inscribirSkater,
    traerSkaters,
    estadoSkater,
    autenticar,
    actualizar,
    borrar,
} = require('./consultas')

app.listen(3000, () => console.log("Servidor encendido en puerto 3000. Escribir en browser localhost:3000"));




app.use("/css", express.static(__dirname + "/node_modules/bootstrap/dist/css"))
app.use("/jquery", express.static(__dirname + "/node_modules/jquery/dist"))
app.use("/img", express.static(__dirname + "/img"))
app.use("/css", express.static(__dirname + "/css"))

app.use(bodyParser.urlencoded({
    extended: true
}))

app.use(bodyParser.json());
app.use(express.static("public"));
app.use(expressFileUpload({
    limits: { fileSize: 5000000 },
    abortOnLimit: true,
    responseOnLimit: "El tamaño de la imagen supera el límite permitido (5MB)"
}));

app.engine("handlebars",
    exphbs({
        defaultLayout: "Main",
        layoutsDir: `${__dirname}/views/components`
    }))
app.set("view engine", "handlebars")

app.get("/", (req, res) => {
    res.render("Index")
})
app.get("/registro", (req, res) => {
    res.render("Registro")
})


app.get("/login", async(req, res) => {
    res.render("Login")
})

app.get("/ingresos", async(req, res) => {
    const registros = await traerSkaters()
    res.send(registros)
})


app.get("/admin", async(req, res) => {
    try {
        const usuarios = await traerSkaters()
        res.render("Admin", { usuarios });
    } catch (e) {
        res.status(500).send({
            error: `Algo salió mal... ${e}`,
            code: 500
        })
    }
})


app.put("/usuarios", async(req, res) => {
    const { id, estado } = req.body
    try {
        const usuario = await estadoSkater(id, estado)
        res.status(200).send(JSON.stringify(usuario))
    } catch (e) {
        res.status(500).send({
            error: `Algo salió mal... ${e}`,
            code: 500
        })
    }
})


app.post("/skaterprofile", async(req, res) => {
    if (Object.keys(req.files).length == 0) {
        return res.status(400).send("No se encontro ningun archivo")
    };


    let email = req.body.email;
    let nombre = req.body.nombre;
    let password2 = req.body.password2;
    let experiencia = req.body.experiencia;
    let especialidad = req.body.especialidad;

    console.log("email", email);
    console.log("nombre", nombre);
    console.log("password2", password2);
    console.log("experiencia", experiencia);
    console.log("especialidad", especialidad);


    let { fotoSkater } = req.files
    let { name } = fotoSkater
    console.log(req.files);

    fotoSkater.mv(`${__dirname}/public/img/${name}`, (err) => {
        if (err) return res.status(500).send({
            error: `Error en consulta ${err}`,
            code: 500
        })
    });


    try {
        const registro = await inscribirSkater(email, nombre, password2, experiencia, especialidad, name)
        res.status(201).render("Login");

    } catch (error) {
        res.status(500).send({
            error: `Error en consulta ${error}`,
            code: 500
        })
    }
});

app.post("/autenticar", async function(req, res) {
    const { email, password } = req.body
    const user = await autenticar(email, password);
    if (user.email) {
        if (user.estado) {
            const token = jwt.sign({
                    exp: Math.floor(Date.now() / 1000) + 180,
                    data: user
                },
                secretKey
            );
            res.send(token)
        } else {
            res.status(401).send({
                error: "Usuario no válido",
                code: 401
            })
        }
    } else {
        res.status(404).send({
            error: "Este usuario no está registrado",
            code: 404
        });
    }
});



app.get("/datos", function(req, res) {
    const { token } = req.query;
    jwt.verify(token, secretKey, (err, decoded) => {
        const { data } = decoded
        const { id, email, nombre, password, especialidad, anos_experiencia } = data
        err
            ?
            res.status(401).send(
                res.send({
                    error: "401 No tiene autorización",
                    message: "No estás autorizado para ingresar a este sitio",
                    token_error: err.message
                })
            ) :
            res.render("Datos", {
                id,
                email,
                nombre,
                password,
                especialidad,
                anos_experiencia
            });
    });
});


app.put("/actualiza", async(req, res) => {
    const { id, nombre, password2, experiencia, especialidad } = req.body
    console.log("id", id);
    console.log("nombre", nombre);
    console.log("password2", password2);
    console.log("experiencia", experiencia);
    console.log("especialidad", especialidad);

    try {
        const result = await actualizar(id, nombre, password2, experiencia, especialidad)
        console.log(result)
        res.status(200).render("Index")

    } catch (e) {
        res.status(500).send({
            error: `Ups! ${e}`,
            code: 500
        })
    }
})
app.delete("/eliminarcuenta", async(req, res) => {
    let { id } = req.body.source

    try {
        const registro = await borrar(id)
        res.status(200).render("Index")

    } catch (e) {
        res.status(500).send({
            error: `Algo salio mal ${e}`,
            code: 500
        })
    }
})


app.get("*", (req, res) => {
    res.send("Ruta inválida")
});

const cambiarEstado = async(id, e) => {
    const estado = e.checked

    try {
        await axios.put("/usuarios", {
            id,
            estado
        })
        alert(estado ? "Aprobado" : "En revisión")

    } catch ({ response }) {
        const { data } = response
        const { error } = data
        alert(error)

    }


}


const verify = document.getElementById('verificacion')
verify.addEventListener("click", async(e) => {
    e.preventDefault()
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    const payload = { email, password }
    try {
        const { data: token } = await axios.post('/autenticar', payload)
        alert("Autenticación ok")
        window.location.href = `/Datos?token=${token}`
    } catch ({ response }) {
        const { data } = response
        const { error } = data
        alert(error)

    }
})


const url = "http://localhost:3000/lista"
let tbody = document.getElementById("tablabody");
window.onload = getData();

async function getData() {
    await axios.get(url + "s").then((response) => {
        skaters = response.data;
        tbody.innerHTML = "";
        skaters.forEach((s, i) => {
            tbody.innerHTML += `
        <tr>
            <td>${i + 1}</td>
            <td><img src=/img/${s.foto} width="50"></td>
            <td>${s.nombre}</td>
            <td>${s.anos_experiencia}</td>
            <td>${s.especialidad}</td>
                 <td  class=${s.estado ? 'text-success' : 'text-warning'}>
                     ${s.estado ? 'Aprobado' : 'En revisión'}
                     </td>
        </tr>
      `;
        });
    });
};

const actualizar = document.getElementById('actualizar')
const eliminar = document.getElementById('eliminar')

actualizar.addEventListener("click", async(e) => {

    e.preventDefault()

    let id = document.getElementById('id').value
    let nombre = document.getElementById("nombre").value
    let password = document.getElementById("password").value
    let password2 = document.getElementById("password2").value
    let experiencia = document.getElementById("experiencia").value
    let especialidad = document.getElementById("especialidad").value

    let payload = { id, nombre, password2, experiencia, especialidad }
    const result = await axios.put("/actualiza", payload)
    alert("Usuario actualizado")
    window.location.href = "/"

})

eliminar.addEventListener("click", async(e) => {

    e.preventDefault()

    let id = document.getElementById('id').value
    const payload = { id }
    const result2 = await axios.delete("/eliminarcuenta", {
        data: { source: payload }
    });

    alert("Cuenta eliminada")
    window.location.href = "/"
})