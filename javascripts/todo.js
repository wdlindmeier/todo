var Todo = {
    
    reloadAllItems  : function(){
        Item.findAll(function(items){
            var sorted = items.partition(function(i){ return !!i.getAttribute('completed_at'); });
            var tasksByList = {'tasks_complete' : sorted[0], 'tasks_incomplete' : sorted[1]};
            for(var listName in tasksByList){
                $(listName).innerHTML = '';
                var listOutput = [];
                var items = tasksByList[listName];
                for(var i=0;i<items.length;i++){
                    var item = items[i];
                    listOutput.push(Todo.listItemForItem(item));
                }
                $(listName).innerHTML = listOutput.join('');                
            }
        });                
    },
    
    listItemForItem : function(item){
        var itemID = item.getAttribute('id');
        var output = ['<li id="item_'+itemID+'">'];
        output.push('<button class="delete" onclick="Todo.confirmDeleteForItem('+itemID+');return false;">');
        output.push('X</button>');
        output.push('<button class="complete" onclick="Todo.markItemAsComplete('+itemID+')">&#10004;</button>');
        //output.push('<span class="tag">TAGNAME</button>');
        output.push(item.getAttribute('description'));
        output.push('</li>');
        return output.join('');
    },
    
    confirmDeleteForItem : function(itemID){
        if(confirm("Are you sure you would like to delete this item?")){
            var item = Item.recordGraph()[itemID];
            if(item){                
                // FUNCTIONAL / TRANSACTIONAL 
                item.destroy(function(item){
                    $('item_'+itemID).remove();
                }.bind(this));
            }                
        }
    },
    
    showNewForm : function(){
        $('new_item_form').show();
    },
    
    createNewItem : function(){
        var item = new Item({description : $('new_item_description').value});
        // FUNCTIONAL / TRANSACTIONAL         
        item.save(function(item){
            Todo.reloadAllItems();
        });
        Todo.cancelNewItem();
    },
    
    cancelNewItem : function(){
        $('new_item_description').value = '';
        $('new_item_form').hide();
    },
    
    markItemAsComplete : function(itemID){
        var item = Item.recordGraph()[itemID];
        // If it's already completed, mark as incomplete
        var completedDate = !!item.getAttribute('completed_at') ? null : new Date();
        item.setAttribute('completed_at', completedDate);
        item.save(function(item){
            Todo.reloadAllItems();
        });
    },
}