const whois = require("whois");
const parser = require('parse-whois');

/**
 * 
 * @param {string} domain The domain to lookup
 * @param {string} lookupPart The key to look for in the whois lookup.  Null for all
 * @returns {(Promise<Date>|Promise<Array<Object>>)} The registration details
 */
async function domainRegistrationParser(domain, lookupPart = null) {
    return await new Promise((resolve, reject) => {
        try {
            whois.lookup(domain, (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                try {
                    const parameters = parser.parseWhoIsData(data);

                    if (!lookupPart) {
                        resolve(parameters);
                        return;
                    }

                    const creationDates = parameters.filter(t => t.attribute.toLowerCase().indexOf(lookupPart) === 0);
        
                    if (creationDates && creationDates.length > 0) {
                        resolve(new Date(creationDates[0].value));
                        return;
                    }
        
                    reject(`domain lookup failed for ${domain}`);
                } catch (lookup_err) {
                    reject(lookup_err);
                    return;
                }
                
            })
        } catch (main_err) {
            reject(main_err);
            return;
        }
    });
}

/**
 * 
 * @param {string} domain The domain
 * @returns {Promise<Date>} The creation date
 */
const getDomainCreationDate = async (domain) => await domainRegistrationParser(domain, "creat");

module.exports = {
    domainRegistrationParser,
    getDomainCreationDate
};