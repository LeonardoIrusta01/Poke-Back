const {Op} = require('sequelize')
const Axios = require('axios')
const {Pokemon, Type} = require('../db');
const {v4: uuidv4, validate: uuidValidate} = require('uuid')

const { Router, response } = require('express');
// Importar todos los routers;
// Ejemplo: const authRouter = require('./auth.js');


const router = Router();

// Configurar los routers
// Ejemplo: router.use('/auth', authR'ERR_HTTP_HEADERS_SENT'outer);


const getPokes = async () => {
    try {
        let response = await Axios.get('https://pokeapi.co/api/v2/pokemon'+'?limit=40')
        let pokes = await Promise.all(response.data.results.map(async p => {
            let pok = await Axios.get(p.url)
            return {
                ID: pok.data.id,
                name: pok.data.name,
                hp: pok.data.stats[0].base_stat,
                attack: pok.data.stats[1].base_stat,
                defense: pok.data.stats[2].base_stat,
                speed: pok.data.stats[5].base_stat,
                height: pok.data.height,
                weight: pok.data.weight,
                type: pok.data.types.map(t => {return t.type.name}),
                image: pok.data.sprites.other.home.front_default
            }
        }))
        return pokes
    } catch (error) {
        return (error)
    }
}
const getPokesDb = async () => {
    let pokes = await Pokemon.findAll({
        include: {
            model: Type,
            attributes: ['ID', 'name'],
            through:{
                attributes: []
            }
        }
    })
    return pokes
}

const findPokeApi = async (attribute) => {
    let res = await Axios.get(`https://pokeapi.co/api/v2/pokemon/${attribute}`)
    if(res){let pokemon = {
            ID: res.data.id,
            name: res.data.name,
            hp: res.data.stats[0].base_stat,
            attack: res.data.stats[1].base_stat,
            defense: res.data.stats[2].base_stat,
            speed: res.data.stats[5].base_stat,
            height: res.data.height,
            weight: res.data.weight,
            type: res.data.types.map(t =>{return t.type.name}),
            image: res.data.sprites.other.home.front_default
    }
    return pokemon
    }
    return false
}

const findPokeDb = async(name) => {
    let res = await Pokemon.findOne({
        where: {
            name:{
                [Op.like]:`%${name}`
            }
        },
        include: Type
    })
    return res
}

const allPokemon = async() => {
    let pokesApi = await getPokes();
    let pokesDb = await getPokesDb();
    let pokeList = pokesApi.concat(pokesDb)
    return pokeList
}

router.get('/pokemons', async (req, res) => {
    const {name} = req.query
    try {
        if(name){
            let pokeDb = await findPokeDb(name)
            if(pokeDb) return res.json(pokeDb)

            let pokeApi = await findPokeApi(name)
            if(pokeApi) return res.json(pokeApi)
        }
        let pokeList = await allPokemon()
        res.status(200).json(pokeList)
    } catch (error) {
        res.status(404).json({error: "El pokemon con el nombre solicitado no existe"})
    }

})

router.get('/pokemons/:idPokemon', async (req, res) => {
    const {idPokemon} = req.params
    try {
        if(uuidValidate(idPokemon)){
            const pokeDB = await Pokemon.findByPk(idPokemon,{
                include: Type
            })
            res.status(200).json(pokeDB)
        } else{
            const pokeApi = await findPokeApi(idPokemon)
            res.status(200).json(pokeApi)
        }
    } catch (error) {
        res.status(404).json({error: "El pokemon con el id solicitado no existe"})
    }
})

router.post('/pokemons', async(req, res) => {
    const {name, hp, attack, defense, speed, height, weight, types} = req.body
    try {
        let pokemon = await Pokemon.create({
            name,
            hp,
            attack,
            defense,
            speed,
            height,
            weight
        })
        let pokeDB = await Type.findAll({
            where: {name: types}
        })
        /* types.forEach(async element => {
            await pokemon.addType(element)
        }); */
        pokemon.addType(pokeDB)
        res.send('Creado con éxito')
    } catch (error) {
        res.status(404).json({error: "El pokemon no pudo ser creado"})
    }
})

router.get('/types', async (req, res) => {
    try {
        let types = await Type.findAll()
        if(!types.length){
            let allTypes = await Axios.get(
                "https://pokeapi.co/api/v2/type"
                );
            types = await allTypes.data.results.map(
                (t) => ({name: t.name})
                )
            await Type.bulkCreate(types)
            types = await Type.findAll()
        }
        
        res.status(200).json(types)
    } catch (error) {
        res.status(404).json({error:"No se pudieron obtener los tipos de la base de datos"})
    }
})

router.delete('/pokemons/:idPokemon', async (req, res) => {
    const {idPokemon} = req.params
    let poke = await Pokemon.findByPk(idPokemon)
    if(poke){
        await Pokemon.destroy({where:{
            ID: idPokemon
        }})
        res.json(`El pokemon de ID:${idPokemon}, ha sido eliminado`)
    } else res.json(`No existe un pokemon de ID: ${idPokemon}`)
})

module.exports = router;