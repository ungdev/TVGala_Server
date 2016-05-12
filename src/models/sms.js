import thinky from '../thinky';

const type = thinky.type;

const Sms = thinky.createModel('Sms', {
    // Optional => not specified in bodies but generated by RethinkDB
    id         : type.string().optional(),
    from       : type.string(),
    content    : type.string(),
    createdAt  : type.date().default(new Date()),
    editedAt   : type.date().default(new Date()),
    isRemoved  : type.boolean().default(false)
}, {
    enforce_missing: true,
    enforce_extra  : 'remove',
    enforce_type   : 'strict'
});

Sms.pre('save', function (next) {
    this.editedAt = new Date();
    next();
});

Sms.ensureIndex('createdAt');
Sms.ensureIndex('editedAt');

Sms.associate = () => {};

export default Sms;