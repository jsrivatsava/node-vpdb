var _ = require('underscore');
var logger = require('winston');
var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

var Schema = mongoose.Schema;

var gameTypes = [ 'ss', 'em', 'pm', 'og'];

// schema
var fields = {
	gameId:        { type: String, required: true, index: true, unique: true },
	title:         { type: String, required: 'Title must be provided.', index: true },
	year:          { type: Number, required: 'Year must be provided.', index: true },
	manufacturer:  { type: String, required: 'Manufacturer must be provided.', index: true },
	gameType:      { type: String, required: true, enum: { values: gameTypes, message: 'Invalid game type. Valid game types are: ["' +  gameTypes.join('", "') + '"].' }},
	short:         Array,
	description:   String,
	instructions:  String,
	producedUnits: Number,
	modelNumber:   String,
	themes:        Array,
	gameDesign:    Array,
	artDesign:     Array,
	features:      String,
	notes:         String,
	toys:          String,
	slogans:       String,
	ipdb: {
		number: Number,
		rating: Number,
		votes: Number
	}
};
var GameSchema = new Schema(fields);

GameSchema.plugin(uniqueValidator, { message: 'The {PATH} "{VALUE}" is already taken.' });


// methods
GameSchema.methods = {

	/**
	 * Returns the URL of the file.
	 *
	 * @return {String}
	 * @api public
	 */
	getUrl: function() {
		return '/game/' + this.gameId;
	}
};

mongoose.model('Game', GameSchema);
logger.info('[model] Model "game" registered.');