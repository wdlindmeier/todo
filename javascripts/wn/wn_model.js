function Model(classFunc){
	
	this.model = classFunc;
	
	// Public Instance methods
	
	this.initialize = function(instanceAttributes){
		// Create the relationship managers
		if(this.model.relationships){
          for(relationshipName in this.model.relationships){
            this[relationshipName] = new RelationshipManager(this, this.model.relationships[relationshipName]);
          }
        }

		// Set any initial attributes
		this.attributes = {};
		for(var attrName in instanceAttributes){
			if(this.model.attributes[attrName]){
				this.attributes[attrName] = instanceAttributes[attrName];
			}else{
				console.log(this.model.className+"#"+attrName+" is not a known attribute");
			}
		}	
		
		// If it has an ID, we'll assume it's not a new record
		this.isNewRecord = ! this.attributes['id'];
	}
	
	this.setAttribute = function(attrName, attrValue){
        // NOTE: We could do some value validation here too
        if(this.model.attributes[attrName]){
            this.attributes[attrName] = attrValue;
            return attrValue;
        }else{
            throw attrName+" is not a "+this.model.className+" attribute";
            return null;
        }
    }

    this.getAttribute = function(attrName){        
        return this.attributes[attrName];
        // TODO: Convert the return values based on their type
    }
    
    this.save = function(callbackHandler){                
        if(this.isNewRecord){
            // insert
            $JSDB.transaction(
                function(transaction){
                    var sqlColumns = 'INSERT INTO '+this.model.tableName()+' (';
                    var sqlValues = 'VALUES (';
                    var values = [];
                    for(var attrName in this.attributes){
                        if(this.model.isMutableAttr(attrName)){
                            sqlColumns += attrName+', ';
                            sqlValues += '?, ' 
                            values.push(this.attributes[attrName]);                            
                        }
                    }               
                    sqlColumns += "created_at, updated_at) ";
                    sqlValues += 'DATETIME("NOW"), DATETIME("NOW"));';
                    transaction.executeSql(sqlColumns+sqlValues, values, function(trans, results){
                        var newObjId = results.insertId;
                        this.setAttribute('id', newObjId);
                        this.setAttribute('created_at', (new Date()).toString());
                        this.setAttribute('updated_at', (new Date()).toString());
                        // Add the record to the graph
                        this.model.recordGraph()[newObjId] = this;
                        // Mark as not new
                        this.isNewRecord = false
                        // Commit any temporary relationships
                        this._commitRelationships();
                        if(callbackHandler){
                            callbackHandler(this);
                        }
                    }.bind(this), WNDB.genericErrorHandler);                       
                }.bind(this)
            );            
        }else{
            // update
            $JSDB.transaction(
                function(transaction){
                    var sqlColumns = 'UPDATE '+this.model.tableName()+' SET ';
                    var values = [];
                    for(var attrName in this.attributes){
                        if(this.model.isMutableAttr(attrName)){
                            sqlColumns += attrName+' = ?, ';
                            values.push(this.attributes[attrName]);                                    
                        }
                    }               
                    sqlColumns += 'updated_at = DATETIME("NOW") WHERE id = ?';
                    values.push(this.getAttribute('id')*1);
                    transaction.executeSql(sqlColumns, values, function(trans, results){
                        this.setAttribute('updated_at', (new Date()).toString());
                        if(callbackHandler){
                            callbackHandler(this);
                        }                        
                    }.bind(this), WNDB.genericErrorHandler);                       
                }.bind(this)
            );
        }
    }
    
    this.destroy = function(callbackHandler){
        if(!this.isNewRecord){
            var myId = this.getAttribute('id')*1;
            $JSDB.transaction(
                function(transaction){
                    // is there going to be an issue with having a transaction-in-a-transaction?
                    this._destroyRelationships();
                    
                    sqlQuery = "DELETE FROM "+this.model.tableName()+" WHERE id = ?;"
                    WNDB.genericDataHandler
                    transaction.executeSql(sqlQuery, [myId], function(transaction, results){                            
                            if(callbackHandler){
                                callbackHandler(this);
                            }else{
                                WNDB.genericDataHandler(transaction, results);
                            }                                                    
                        }.bind(this), WNDB.genericErrorHandler);                       
                }.bind(this)
            );
            // remove it from the object graph
            delete this.model.recordGraph()[myId];
        }
    }
    
    // Private Instance Methods
    
    this._commitRelationships = function(){
        for(relationshipName in this.model.relationships){
            this[relationshipName].commit();
        }
    }

    this._destroyRelationships = function(){
        for(relationshipName in this.model.relationships){
            this[relationshipName].set(null);
        }
    }
    
}

Object.extend(Model, {
	
	// These columns can't be modified by hand
	immutableColumns            : ['udpated_at', 'created_at', 'id'],
	
	// Public Class Methods
	
	tableName                   : function(){	    
	    if(!this._tableName){
	        this._tableName = this.className.toLowerCase().replace(/y$/, 'ie').replace(/$/, 's');
	    }
	    return this._tableName;
	},
	
	isMutableAttr               : function(attrName){
	  return this.immutableColumns.indexOf(attrName.toLowerCase()) == -1;
	},
	
    // Model.recordGraph is a hash that keeps a single copy of each record.
	recordGraph                 :  function(){
	    if(!this._recordGraph){
	        this._recordGraph = {};  
	    }
	    return this._recordGraph;
	},
	
	count                       :   function(callbackHandler){
        $JSDB.transaction(
            function (transaction) {
                transaction.executeSql("SELECT COUNT(id) FROM "+this.tableName()+";", [], function(trans, results){
                    // TODO: Should we always fallback on the generic handler?
                    var count = results.rows.item(0)['COUNT(id)'];
                    if(callbackHandler){
                        callbackHandler(count);
                    }else{
                        console.log(this.tableName()+" COUNT : "+count);
                    }
                }.bind(this), WNDB.genericErrorHandler);
	        }.bind(this)
        );
	},
	
	findAll                     : function(callbackHandler){
        this.findBySql("SELECT * FROM "+this.tableName()+" ORDER BY id;", [], callbackHandler);
    },
  
    findById                    : function(objId, callbackHandler){
        this.findBySql("SELECT * FROM "+this.tableName()+" WHERE id = ? LIMIT 1;", [objId], callbackHandler);
    },
    
    findByAttributes            : function(conditions, callbackHandler){
        var conditionArray = $H(conditions).toArray();
        var clause = conditionArray.map(function(keyValue, i){return keyValue[0]+" = ?"}).join("AND");
        var values = conditionArray.map(function(keyValue, i){return keyValue[1]});
        var query = "SELECT * FROM "+this.tableName()+" WHERE "+clause+";"
        this.findBySql(query, values, callbackHandler);
    },
    
	findBySql                   : function(sqlQuery, queryValues, callbackHandler){
        $JSDB.transaction(
            function (transaction) {
                //var query = "SELECT * FROM "+this.tableName()+" ORDER BY id;";
                //console.log(query);
                transaction.executeSql(sqlQuery, queryValues, function(trans, results){
                    // Handle the results
                    var records = [];
                    for (var i=0; i<results.rows.length; i++) {
                        var row = results.rows.item(i);
                        var record = null;
                        // If there is a record in-memory that will always trump the one from the
                        // database, since it's possible there are in-memory updates to it.                        
                        if(!(record = this.recordGraph()[row['id']])){
                            record = new this(row);
                            this.recordGraph()[row['id']] = record;
                        }                         
                        records.push(record);
                    }
                    if(callbackHandler) callbackHandler(records);
                }.bind(this),
                function(trans, error){
                    console.log("Error");
                    console.log(error);
                    if(callbackHandler) callbackHandler(null);
                });
            }.bind(this)
        );
    }
});