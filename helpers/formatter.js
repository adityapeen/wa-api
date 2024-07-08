const phoneNumberFormatter = function(number){
    // Remove non number character 
    let formatted = number.replace(/\D/g,'');
    // Replace 0 to 62 (region code)
    if(formatted.startsWith('0')){
        formatted = '62' + formatted.substr(1);
    }

    if(!formatted.endsWith('@c.us')){
        formatted += '@c.us';
    }

    return formatted;
}

const clientIdDeformatter = function(str){
    // Remove '62' and '@c.us'
    let modifiedStr = str.replace('62', '').replace('@c.us', '');
    // Add '0' at the beginning
    modifiedStr = '0' + modifiedStr;
    return btoa(modifiedStr); //Return number in base64 format
}

module.exports = {
    phoneNumberFormatter, clientIdDeformatter
}