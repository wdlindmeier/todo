function DBRelationship(ownerModel, relatedModel, relationshipType){
    this.ownerModel = ownerModel;
    this.relatedModel = relatedModel;
    this.relationshipType = relationshipType;
    this.tableName = function(){
        if(!this._tableName){
            switch(this.relationshipType){
                case DBRelationships.manyToMany:
                    this._tableName = [this.ownerModel.tableName(), this.relatedModel.tableName()].sort().join('_');        
                break;
                case DBRelationships.hasOne:
                    this._tableName = this.relatedModel.tableName();
                break;
                case DBRelationships.hasMany:
                    this._tableName = this.relatedModel.tableName();
                break;
                case DBRelationships.belongsTo:
                    this._tableName = this.ownerModel.tableName();
                break;
            }
        }
        return this._tableName;
    }    
}

function RelationshipManager(parent, relationship){

    // Private attributes
    
    this._parent = parent;
    this._relationship = relationship;
    this._isMultipleAssociation = relationship.relationshipType == DBRelationships.hasMany || relationship.relationshipType == DBRelationships.manyToMany;
    this._ownerTableName = this._relationship.ownerModel.tableName();
    this._relatedTableName = this._relationship.relatedModel.tableName();
    this._tableName = this._relationship.tableName();
    this._foreignKey = this._relationship.relatedModel.className.toLowerCase()+'_id';
    this._myKey = this._relationship.ownerModel.className.toLowerCase()+'_id';    
    
    // Public Attrs
    
    // NOTE: Collection is a generic term for 
    // associated records that are in-memory
    this.cached = this._isMultipleAssociation ? [] : null;        
    
    // Public Instance Methods
    
    this.fetch = function(callbackHandler){
        if(callbackHandler) this._fetchCallback = callbackHandler;
        // NOTE: This is calling SQL every-time and never ONLY returning cached results.
        // If we start returning cached results, we need to remove reverse-relationships when we add/set/remove
        if(this._parent.isNewRecord){
            this._updateCollectionWithRecords([]);
        }else{
            var query = this._fetchQuery();
            this._relationship.relatedModel.findBySql(query.sql, query.values, this._updateCollectionWithRecords);
        }
    }
    
    this.add = function(oneOrMoreRecords){
        if(this._isMultipleAssociation){
            this._concatRecords(oneOrMoreRecords);
            this.commit();
        }else{
        	this.set(oneOrMoreRecords);
        }        
    }
    
    this.set = function(oneOrMoreRecords){        
        
        // Removing the associations in the DB if the record is not new
        if(!this._parent.isNewRecord){
          $JSDB.transaction( function (transaction) {
            var query = this._removeAllQuery();
            transaction.executeSql(query.sql, query.values, WNDB.genericDataHandler, WNDB.genericErrorHandler);            
          }.bind(this));
        }
        
        // NOTE: This does not alter any reverse relationships.
        // This shouldnt be an issue until we start caching relationships
        
        if(this._isMultipleAssociation){
            this.cached = oneOrMoreRecords ? oneOrMoreRecords.uniq() : [];
        }else{
            // Check if it's a Model instance
            if(oneOrMoreRecords && Object.isUndefined(oneOrMoreRecords.model)){
                throw "Attempting to set a one-to-one relationship with a non-Model";
            }
            this.cached = oneOrMoreRecords;
        }        
        
        this.commit();
    }
    
    this.remove = function(record){

        // Removing the association in the DB if _parent is saved
        if(!this._parent.isNewRecord){
            var query = this._removeOneQuery(record);
            $JSDB.transaction( function (transaction) {
              transaction.executeSql(query.sql, query.values, WNDB.genericDataHandler, WNDB.genericErrorHandler);
            }.bind(this));
        }
        
        if(this._isMultipleAssociation){
            var objIndex = this.cached.indexOf(record);
            if(objIndex != -1){
                this.cached.splice(objIndex, 1);                
            }
        }else{
            if(record == this.cached){
                this.cached = null;
            }
        }
        this.commit();
    }
    
    // This is called after a record is saved... or whenever we want to commit the relationships to the DB
    this.commit = function(){
        // We cant commit the relationship unless the _parent is in the DB
        if(!this._parent.isNewRecord){
            var commitToSQL = false;
            // NOTE: This is where we would establish corresponding in-memory relationships                
            switch(this._relationship.relationshipType){
                case DBRelationships.belongsTo:
                    if(this.cached){
                        var foreignId = this.cached.getAttribute('id');
                        if(foreignId){
                            this._parent.setAttribute(this._foreignKey, foreignId);
                            commitToSQL = true;
                        }else{
                            throw "Relationship can not be committed because related object has not been saved";
                        }                    
                    }
                break;
                case DBRelationships.hasMany:
                    if(this.cached.length > 0){
                        var allSaved = this.cached.all(function(r){return r.getAttribute('id')});
                        if(!allSaved){
                            throw "Relationship can not be committed because 1 or more related objects has not been saved";
                        }else{
                            for(var o=0;o<this.cached.length;o++){
                                var record = this.cached[o];
                                record.setAttribute(this._myKey, this._parent.getAttribute('id'));
                                if(!record.getAttribute('id')) allSaved = false;
                            }
                            commitToSQL = true;                            
                        }                        
                    }
                break;
                case DBRelationships.hasOne:
                    if(this.cached){
                        if(this.cached.getAttribute('id')){
                            this.cached.setAttribute(this._myKey, this._parent.getAttribute('id'));
                            commitToSQL = true;
                        }else{
                            throw "Relationship can not be committed because related object has not been saved";
                        }
                    }                  
                break;
                case DBRelationships.manyToMany:
                    if(this.cached.length > 0){
                        var allSaved = this.cached.all(function(r){return r.getAttribute('id')});
                        if(!allSaved){
                            throw "Relationship can not be committed because 1 or more related objects has not been saved";
                        }else{
                            for(var o=0;o<this.cached.length;o++){
                                var record = this.cached[o];
                                if(!record.getAttribute('id')) allSaved = false;
                            }
                            commitToSQL = true;
                        }
                    }
                break;                
            }                            
            if(commitToSQL){
              var query = this._commitQuery();
              $JSDB.transaction( function (transaction) {
                  transaction.executeSql(query.sql, query.values, WNDB.genericDataHandler, WNDB.genericErrorHandler);
              }.bind(this));
            }
        }else{
            console.log("WARN: Relationship can not be committed because record has not been saved");
        }        
    }
     
    // Private Instance Methods
    
    // This is a placeholder callback that can be overwritten by the caller
    this._fetchCallback = function(r){console.log(r)};    
        
    this._fetchQuery = function(){
        if(this._parent.isNewRecord) return null;
        if(!this._fetchQueryData){            
          switch(this._relationship.relationshipType){
              case DBRelationships.belongsTo:
                  this._fetchQueryData = { sql : 'SELECT * FROM '+this._relatedTableName+' WHERE id = ? LIMIT 1;',
                                        values : [this._parent.getAttribute(this._foreignKey)]};
              break;
              case DBRelationships.hasMany:
                  this._fetchQueryData = { sql : 'SELECT * FROM '+this._relatedTableName+' WHERE '+this._myKey+' = ?;', 
                                        values : [this._parent.getAttribute('id')]};
              break;
              case DBRelationships.hasOne:
                  this._fetchQueryData = { sql : 'SELECT * FROM '+this._relatedTableName+' WHERE '+this._myKey+' = ? LIMIT 1;', 
                                        values : [this._parent.getAttribute('id')]};
              break;
              case DBRelationships.manyToMany:
                  this._fetchQueryData = { sql : 'SELECT '+this._relatedTableName+'.* FROM '+this._relatedTableName+' LEFT OUTER JOIN '+this._tableName+' ON '+this._tableName+'.'+this._foreignKey+' = '+this._relatedTableName+'.id WHERE '+this._tableName+'.'+this._myKey+' = ?;', 
                                        values : [this._parent.getAttribute('id')]};
              break;                
          }                
        }
        return this._fetchQueryData;
    }
    
    this._commitQuery = function(){
        if(this._parent.isNewRecord) return null;      
        if(!this._commitQueryData){
          switch(this._relationship.relationshipType){
              case DBRelationships.belongsTo:
                  this._commitQueryData = { sql : 'UPDATE '+this._ownerTableName+' SET '+this._foreignKey+' = ? WHERE id = ?;', 
                                        values : [this._parent.getAttribute(this._foreignKey), this._parent.getAttribute('id')]};
              break;
              case DBRelationships.hasMany:
                  this._commitQueryData = { sql : 'UPDATE '+this._relatedTableName+' SET '+this._myKey+' = ? WHERE id IN (?);',
                                        values : [this._parent.getAttribute('id'), this.cached.map(function(r){return r.getAttribute('id')})]};
              break;
              case DBRelationships.hasOne:
                  this._commitQueryData = { sql : 'UPDATE '+this._relatedTableName+' SET '+this._myKey+' = ? WHERE id = ?;',
                                        values : [this._parent.getAttribute('id'), this.cached.getAttribute('id')]};
              break;
              case DBRelationships.manyToMany:
                  // http://www.planet-source-code.com/vb/scripts/ShowCode.asp?txtCodeId=897&lngWId=5
                  var selects = []
                  var ids = [];
                  for(var i=0;i<this.cached.length;i++){
                      selects.push('SELECT ?, ?');
                      ids.push(this.cached[i].getAttribute('id'));
                      ids.push(this._parent.getAttribute('id'));
                  }
                  this._commitQueryData = { sql : 'INSERT INTO '+this._tableName+' ('+this._foreignKey+', '+this._myKey+') '+selects.join(' UNION ALL ')+';',
                                        values : ids};
              break;                
          }                
        }
        return this._commitQueryData;
    }
    
    this._removeAllQuery = function(){
        if(this._parent.isNewRecord) return null;      
        if(!this._removeAllQueryData){
          switch(this._relationship.relationshipType){
              case DBRelationships.belongsTo:
                  this._removeAllQueryData = { sql : 'UPDATE '+this._ownerTableName+' SET '+this._foreignKey+' = NULL WHERE id = ?;',
                                          values : [this._parent.getAttribute('id')]};
              break;
              case DBRelationships.hasMany:
                  this._removeAllQueryData = { sql : 'UPDATE '+this._relatedTableName+' SET '+this._myKey+' = NULL WHERE '+this._myKey+' = ?;',
                                          values : [this._parent.getAttribute('id')]};
              break;
              case DBRelationships.hasOne:
                  this._removeAllQueryData = { sql : 'UPDATE '+this._relatedTableName+' SET '+this._myKey+' = NULL WHERE '+this._myKey+' = ?;', 
                                          values : [this._parent.getAttribute('id')]};
              break;
              case DBRelationships.manyToMany:
                  this._removeAllQueryData = { sql : 'DELETE FROM '+this._tableName+' WHERE '+this._tableName+'.'+this._myKey+' = ?;',
                                          values : [this._parent.getAttribute('id')]};
              break;                
          }                
        }
        return this._removeAllQueryData;
    }

    this._removeOneQuery = function(relatedObject){
        if(this._parent.isNewRecord) return null;      
        if(!this._removeOneQueryData){
            switch(this._relationship.relationshipType){
                case DBRelationships.belongsTo:
                    this._removeOneQueryData = this._removeAllQueryData();
                break;
                case DBRelationships.hasMany:
                    this._removeOneQueryData = { sql : 'UPDATE '+this._relatedTableName+' SET '+this._myKey+' = NULL WHERE id = ?;', 
                                            values : [relatedObject.getAttribute('id')]};
                break;
                case DBRelationships.hasOne:
                    this._removeOneQueryData = { sql : 'UPDATE '+this._relatedTableName+' SET '+this._myKey+' = NULL WHERE id = ?;', 
                                            values : [relatedObject.getAttribute('id')]};
                break;
                case DBRelationships.manyToMany:
                    this._removeOneQueryData = { sql : 'DELETE FROM '+this._tableName+' WHERE '+this._tableName+'.'+this._myKey+' = ? AND '+this._tableName+'.'+this._foreignKey+' = ?;', 
                                            values : [this._parent.getAttribute('id'), relatedObject.getAttribute('id')]};
                break;                
            }                
        }
        return this._removeOneQueryData;
    }
    
    this._concatRecords = function(records){
        this.cached = this.cached.concat(records).uniq();
    }
    
    this._updateCollectionWithRecords = function(records){
        if(this._isMultipleAssociation){
            this._concatRecords(records);
        }else{
            this.cached = this.cached ? this.cached : records[0];
        }
        this._fetchCallback(this.cached);
        
    }.bind(this) // We have to bind because this method might be called by a transaction
    
}