document.observe('dom:loaded', function(){
   
    // Updates the dropdown list with all the tags
    Todo.loadAllTags();

    // Updates the list display with items in the DB.
    Todo.reloadAllItems();
    
    // Shows the new item form
    $('add_item').observe('click', function(){
        Todo.showNewForm();
    });

    // Enter/exit edit mode
    $('edit_list').observe('click', function(){
        Todo.toggleEditingMode();
    });

    $('cancel_edit_item').observe('click', function(){
        Todo.cancelEditItem();
    });

    $('save_edit_item').observe('click', function(){
        Todo.saveEditItem();
    });

    // Creates a new tag, and selects it
    $('button_add_tag').observe('click', function(){
        Todo.createNewTag();
    });

    // Removes a tag
    $('button_remove_tag').observe('click', function(){
        Todo.destroyCurrentTag();
    }); 
    
    // Sort Columns
    $('sort_complete_created_at').observe('click', function(){
        Todo.updateSortOrder('complete', 'created_at');
    });

    $('sort_complete_completed_at').observe('click', function(){
        Todo.updateSortOrder('complete', 'completed_at');
    });

    $('sort_complete_tag_id').observe('click', function(){
        Todo.updateSortOrder('complete', 'tag_id');
    });
    
    $('sort_incomplete_created_at').observe('click', function(){
        Todo.updateSortOrder('incomplete', 'created_at');
    });

    $('sort_incomplete_position').observe('click', function(){
        Todo.updateSortOrder('incomplete', 'position');
    });

    $('sort_incomplete_tag_id').observe('click', function(){
        Todo.updateSortOrder('incomplete', 'tag_id');
    });
    
});