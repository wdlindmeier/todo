var Todo = {
    
    isEditing : false,
    
    reloadAllItems  : function(){
        Item.findAll(function(items){
            var sorted = items.partition(function(i){ return !i.getAttribute('completed_at'); });
            
            var sortOrderIncomplete = localStorage['sort_order_incomplete'] || -1;
            var sortColumnIncomplete = localStorage['sort_column_incomplete'] || 'priority';

            var sortOrderComplete = localStorage['sort_order_complete'] || -1;
            var sortColumnComplete = localStorage['sort_column_complete'] || 'completed_at';
            
            var tasksByList = {
                'tasks_incomplete' : sorted[0].sort(function(a,b){
                    // Note: This is comparing the tag_id, not the tag.
                    // While it lumps the tags together, it doesnt alphabetise them                            
                    return a.getAttribute(sortColumnIncomplete) > b.getAttribute(sortColumnIncomplete) ? sortOrderIncomplete : sortOrderIncomplete * -1;
                }), 
                'tasks_complete' : sorted[1].sort(function(a,b){
                    return a.getAttribute(sortColumnComplete) > b.getAttribute(sortColumnComplete) ? sortOrderComplete : sortOrderComplete * -1;
                })
            };
            for(var listName in tasksByList){
                $(listName).innerHTML = '';
                var items = tasksByList[listName];
                for(var i=0;i<items.length;i++){
                    var item = items[i];
                    $(listName).appendChild(Todo.listItemForItem(item));
                }
            }
        });                
    },
    
    updateSortOrder : function(status, sortColumn){
        // Remove the selected class from the existing sort button
        var sortButton = $('sort_'+status+'_'+localStorage['sort_column_'+status]);
        if(sortButton) sortButton.removeClassName('selected');

        if(status == 'incomplete'){
            var sortKey = 'sort_column_incomplete';
            var orderKey = 'sort_order_incomplete';            
        }else{
            var sortKey = 'sort_column_complete';
            var orderKey = 'sort_order_complete';            
        }
        
        // If this is the same column that we're currently sorting on, 
        // just reverse the direction. Else, default to -1.
        localStorage[orderKey] = localStorage[sortKey] == sortColumn ? localStorage[orderKey] * -1 : -1;
        localStorage[sortKey] = sortColumn;
        
        $('sort_'+status+'_'+localStorage['sort_column_'+status]).addClassName('selected');
        
        Todo.reloadAllItems();
    },
    
    makeItemEditable : function(itemID){
        if(Todo.isTouchingItem){
            Todo.cancelEditItem();
            var li = $('item_'+itemID);
            li.parentNode.insertBefore($('edit_item_form'), li);
            var item = Item.recordGraph()[itemID];
            // set tag
            $('edit_item_tag_id').value = item.getAttribute('tag_id');
            // set description
            $('edit_item_description').value = item.getAttribute('description');
            // set the id
            $('edit_item_id').value = itemID;
            $('edit_item_form').show();
            li.hide();        
        }        
    },
    
    listItemForItem : function(item){
        var itemID = item.getAttribute('id');
        var li = document.createElement('li');
        li.setAttribute('id', 'item_'+itemID);

        li.onmousedown = function(e){
            Todo.isTouchingItem = true;
            setTimeout("Todo.makeItemEditable("+itemID+")", 600);
        }

        document.onmouseup = function(e){
            Todo.isTouchingItem = false;
            document.onmouseup = null;
        }
        
        var buttonDelete = document.createElement('button');
        buttonDelete.className = 'delete';
        buttonDelete.onclick = function(e){ Todo.confirmDeleteForItem(itemID); return false; }.bind(this);
        buttonDelete.innerHTML = 'X';
        li.appendChild(buttonDelete);
        
        var buttonComplete = document.createElement('button');
        buttonComplete.className = 'complete';
        buttonComplete.onclick = function(e){ Todo.markItemAsComplete(itemID); return false; }.bind(this);
        buttonComplete.innerHTML = '&#10004;';
        li.appendChild(buttonComplete);
        
        var tagID = item.getAttribute('tag_id');
        var tag = Tag.recordGraph()[tagID];
        if(tag){
            var spanTag = document.createElement('span');
            spanTag.className = 'tag';
            spanTag.innerHTML = tag.getAttribute('name');
            li.appendChild(spanTag);
        }
        var spanDescription = document.createElement('span');
        spanDescription.className = 'item_description';
        spanDescription.innerHTML = item.getAttribute('description');
        li.appendChild(spanDescription);        
        return li;
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
        // Cancel it in-case it's already visible
        Todo.cancelEditItem();        
        // Move the form above the incomplete list
        $('tasks_incomplete').parentNode.insertBefore($('edit_item_form'), $('tasks_incomplete'));        
        $('edit_item_form').show();
    },
    
    clearEditingForm : function(){
        // clear tag
        $('edit_item_tag_id').value = '';
        // clear description
        $('edit_item_description').value = '';
        // clear the id
        $('edit_item_id').value = '';                
    },
    
    saveEditItem : function(){
        var itemID = $('edit_item_id').value;
        if(itemID){
            var item = Item.recordGraph()[$('edit_item_id').value];
        }else{
            var item = new Item();
        }
        var tagID = $('edit_item_tag_id').value;
        if(tagID){
            var tag = Tag.recordGraph()[tagID];
            item.tag.set(tag);
        }
        item.setAttribute('description', $('edit_item_description').value);
        item.save(function(item){
            Todo.reloadAllItems();
        });
        // Close out the new form
        Todo.cancelEditItem();
    },
    
    cancelEditItem : function(){
        var itemID = $('edit_item_id').value;        
        Todo.clearEditingForm();
        $('edit_item_form').hide();
        if(itemID) $('item_'+itemID).show();
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
    
    loadAllTags : function(selectedTagId){
        Tag.findAll(function(tags){
            var options = ['<option value="">[ none ]</option>'];
            for(var t=0;t<tags.length;t++){
                var tag = tags[t];
                options.push('<option value="'+tag.getAttribute('id')+'">'+tag.getAttribute('name')+'</option>')
            } 
            var optionsHTML = options.join('\n');
            $('edit_item_tag_id').innerHTML = optionsHTML;
            $('edit_item_tag_id').value = selectedTagId;
        });
    },
    
    destroyCurrentTag : function(){
        var tagId = $('edit_item_tag_id').value;
        var tag = Tag.recordGraph()[tagId];
        if(tag && confirm("Are you sure you want to remove the tag "+tag.getAttribute('name')+"?")){
            if(tag) tag.destroy(function(){
                Todo.loadAllTags();
                // Reloading the items so the old tag doesnt show up any more.
                // Perhaps this could be more surgical
                Todo.reloadAllItems();                
            });
        }       
    },

    createNewTag : function(){
        var tagname = prompt("Please enter a tag name:");
        if(tagname && !!tagname.strip()){
            var tag = new Tag({name : tagname});
            tag.save(function(t){
               Todo.loadAllTags(t.getAttribute('id')); 
            });
        }       
    },
    
    toggleEditingMode : function(){
        Todo.isEditing = !Todo.isEditing;
        if(Todo.isEditing){
            $('edit_list').innerHTML = 'Done';
            document.body.addClassName('editing');
        }else{
            $('edit_list').innerHTML = 'Edit';
            document.body.removeClassName('editing');
        }
    }
}