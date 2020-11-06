var express = require('express');
var router = express.Router();

const getPet = require('../handlers/petHandler').handleGetPet;
const deletePet = require('../handlers/petHandler').handleDeletePet;
const createPet = require('../handlers/petHandler').handleCreatePet;
const updatePet = require('../handlers/petHandler').handleUpdatePet;

router.get('/:pname', (req, res) => getPet(req, res));
router.delete('/:pname/:petname', (req, res) => deletePet(req, res));
router.post('/:username', (req, res) => createPet(req, res));
router.put('/:pname/:pet_name', (req, res) => updatePet(req, res));

module.exports = router;