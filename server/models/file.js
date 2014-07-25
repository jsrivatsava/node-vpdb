var _ = require('underscore');
var path = require('path');
var logger = require('winston');
var mongoose = require('mongoose');
var shortId = require('shortid');
var config = require('./../modules/settings').current;
var mimeTypes = require('./../modules/mimetypes');

var Schema = mongoose.Schema;

//-----------------------------------------------------------------------------
// SCHEMA
//-----------------------------------------------------------------------------
var fields = {
	id:           { type: String, required: true, unique: true, 'default': shortId.generate },
	name:         { type: String, required: 'Filename must be provided.' },
	bytes:        { type: Number, required: true },
	created_at:   { type: Date, required: true },
	mime_type:    { type: String, required: true, enum: { values: _.keys(mimeTypes), message: 'Invalid MIME type. Valid MIME types are: ["' +  _.keys(mimeTypes).join('", "') + '"].' }},
	file_type:    { type: String, required: true },
	metadata:     { type: Schema.Types.Mixed },
	public:       { type: Boolean, required: true, default: false },
	active:       { type: Boolean, required: true, default: false },
	variations:   { type: Schema.Types.Mixed },
	_author:      { type: Schema.ObjectId, required: true, ref: 'User' }
};
var FileSchema = new Schema(fields);


//-----------------------------------------------------------------------------
// VIRTUALS
//-----------------------------------------------------------------------------
FileSchema.virtual('author')
	.get(function() {
		if (this.populated('_author')) {
			return this._author.toReduced();
		}
	});


//-----------------------------------------------------------------------------
// METHODS
//-----------------------------------------------------------------------------

/**
 * Returns the physical location of the file.
 *
 * @return {String}
 * @api public
 */
FileSchema.methods.getPath = function(variationName) {
	var ext = '.' + mimeTypes[this.mime_type].ext;
	return variationName
		? path.resolve(config.vpdb.storage, variationName, this.id) + ext
		: path.resolve(config.vpdb.storage, this.id) + ext;
};

/**
 * Returns the URL of the file.
 *
 * @return {String}
 * @api public
 */
FileSchema.methods.getUrl = function(variationName) {
	return variationName
		? '/storage/' + this.id + '/' + variationName
		: '/storage/' + this.id;
};

/**
 * Returns the "primary" type (the part before the `/`) of the mime type.
 * @returns {string}
 */
FileSchema.methods.getMimeType = function() {
	return this.mime_type.split('/')[0];
};

/**
 * Returns the sub type (the part after the `/`) of the mime type.
 * @returns {string}
 */
FileSchema.methods.getMimeSubtype = function() {
	return this.mime_type.split('/')[1];
};


//-----------------------------------------------------------------------------
// OPTIONS
//-----------------------------------------------------------------------------
FileSchema.set('toObject', { virtuals: true });
if (!FileSchema.options.toObject) {
	FileSchema.options.toObject = {};
}
FileSchema.options.toObject.transform = function(doc, file) {
	delete file.__v;
	delete file._id;
	delete file._author;
};

mongoose.model('File', FileSchema);
logger.info('[model] Model "file" registered.');
