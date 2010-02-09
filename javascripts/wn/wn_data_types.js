// DB Data Types

const DBTypes	= {
	'string'		: 1,
	'integer'		: 2,
	'text'			: 3,
	'boolean'		: 4,
	'datetime'	    : 5,
	'float'			: 6,
}

// NOTE: If we add a relationship type, add it to each switch
const DBRelationships = {
    'belongsTo'     : 1,
	'hasMany'       : 2,
	'hasOne'        : 3,
	'manyToMany'    : 4	
}

const DBErrors 	= {	
	'NonDBError'					: 	0,
	    // Other non-database-related error.
	'DBErrorOther'					: 	1,
	    // Other database-related error.
	'DBVersionError'				: 	2,
	    // The version of the database is not the version that you requested.
	'DBErrorDataTooLarge'			: 	3,
	    // Data set too large. There are limits in place on the maximum result size that can be returned by a single query. If you see this error, you should either use the LIMIT and OFFSET constraints in the query to reduce the number of results returned or rewrite the query to return a more specific subset of the results.
	'DBErrorStorageLimitExceeded'	: 	4,
	    // Storage limit exceeded. Either the space available for storage is exhausted or the user declined to allow the database to grow beyond the existing limit.
	'DBErrorLockContention'			: 	5,
	    // Lock contention error. If the first query in a transaction does not modify data, the transaction takes a read-write lock for reading. It then upgrades that lock to a writer lock if a subsequent query attempts to modify data. If another query takes a writer lock ahead of it, any reads prior to that point are untrustworthy, so the entire transaction must be repeated. If you receive this error, you should retry the transaction.
	'DBErrorConstraintFailure'		: 	6
	    // Constraint failure. This occurs when an INSERT, UPDATE, or REPLACE query results in an empty set because a constraint on a table could not be met. For example, you might receive this error if it would cause two rows to contain the same non-null value in a column marked as the primary key or marked with the UNIQUE constraint.
}