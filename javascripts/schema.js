var WNDatabaseInfo = {

    SchemaVersion   : '1.0',
    DBName          : 'TodoList',
    DisplayName     : 'Todo Database',
    MaxSize         : 2000000,

    Schema          : {
        Item : {
            attributes : {
                id				            : 'integer',              
                created_at		            : 'datetime',		          
                updated_at		            : 'datetime',
                completed_at                : 'datetime',
                description 			    : 'text',
                position                    : 'integer',
                tag_id                      : 'integer'
            },
            relationships : {
                tag                         : { Tag     : 'belongsTo' }
            },
            indexes : ['created_at', 'updated_at', 'completed_at', 'position', 'tag_id']
        },

        Tag : {
            attributes : { 
                id				            : 'integer',
                created_at		    	    : 'datetime',
                updated_at		    	    : 'datetime',
                name 			            : 'string',
            },
            relationships : {
                items	    	            : { Item     : 'hasMany' }
            },
            indexes : ['created_at', 'updated_at', 'name']
        }        
    }
}