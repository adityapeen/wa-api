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

module.exports = {
    phoneNumberFormatter
}