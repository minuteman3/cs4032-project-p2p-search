module.exports = hashit

function hashit(value) {
    hash = 0;
    for (var char in value) {
        hash = hash * 31 + value.charCodeAt(char);
        if (hash * 31 + value.charCodeAt(char) > Math.pow(2,32)) {
            hash = hash % Math.pow(2,32);
        }
    }
    return hash;
}
