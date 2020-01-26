
var objectNames = {};// object of tag keys and values in the editing environment
var rowLanguages = {};// array of tags keys in the form
var numAltName = 0;
var typingLanguage = false;
var editedObject = {};// information abot the currenlty edited object
var proposals = {};// liste of downloaded proposals, type + id => proposals array

$(function(){	
	$("#button_save_edit").click(saveObject);
});

function setChangeEvents()
{
	$(".name_edit").unbind();
	$(".name_edit").change(function(){
		objectNames[$(this).attr("name")] = $(this).val();
//		alert($(this).attr("name")+" => "+$(this).val())	
	});
	// set the autocompletion for all edits fields, with existing values
	$(".name_edit").autocomplete("destroy");
	var proposedNames = [];
	$(".name_edit").each(function(){
		if(proposedNames.indexOf($(this).val()) == -1)
		{
			proposedNames.push($(this).val());
		}
	});
	$(".name_edit").autocomplete({
		source:proposedNames,
		select:function(ui,event){$(this).val(event.item.value);$(".name_edit").change()}// trigger the change event to save the autocompleted value
	});
}

/**
 * Save the edits in the form
 */
function saveObject()
{
	if(typingLanguage)
	{	// prevent from switching to "Changeset" tab if the user is typing a language code
		return;
	}
	var reqParams = objectNames;
	reqParams.action = 'set';
	reqParams.id = editedObject.id;
	reqParams.type = editedObject.type;
	$.ajax({
		dataType:'text',
		url: "api/osm_iface.php",
		data:reqParams,
		success: function(e){
			if(e  == 1)
			{
				$("#tabs").tabs("enable",2);
				$("#tabs").tabs("select",2);
			}
			else
			{
				alert(LANG.ERROR_SAVE);
			}
			$( "#waitDialog" ).dialog('close');
		},
		error: function(e){alert(LANG.ERROR_SAVE);}
    });
}

/**
 * Request to get a give OSM object from the API
 * and then display the edit form
 * @param type object type
 * @param id object id
 */
function beginEdit(type,id)
{
	$( "#waitDialog" ).dialog('open');
	$.ajax({
		dataType:'text',
		url: "api/osm_iface.php",
		data:{
			'action':'get',
			'type':type,
			'id':id
		},
		success: function(e){
			if($(e).find('tag').length == 0){
				$( "#waitDialog" ).dialog('close');
				alert("Invalid object");
				return;
			}
			editedObject.type = type;
			editedObject.id = id;
			objectNames = {};
			
			// All name fields are hidden
			for(var key in NAME_FIELDS)hideNameField(key);
			
			$("#table_other_tags").empty();
			$("#table_names .alternative").remove();
			numAltName = 0;
			
			// tags are sorted by keys
			var tags = {};// associatice array tag key => tags values
			var keys = [];// array of tag keys
			$(e).find('tag').each(function(){
				tags[$(this).attr("k")] = $(this).attr("v");
				keys.push($(this).attr("k"));
			});
			keys.sort();// keys are sorted
			
			for(var numKey in keys) {
				var key = keys[numKey];
				if(key in NAME_FIELDS)
			    {
			    	displayNameField(key,tags[key]);
			    }
				else if(key.substring(0,4) != "name")
			    {
			    	$("#table_other_tags").append("<tr><td>"+key+"</td><td>"+tags[key]+"</td></tr>")
			    }
			    else if(key == "name")
			    {
			    	$("#edit_name").val(tags[key]);
			    	objectNames["name"] = tags[key];
			    }
			    else
			    {
			    	var code = key.substring(5);
			    	var label = code;
					if(code in LANGUAGE_CODES)
						label += ' <span class="placeDetails">('+LANGUAGE_CODES[code]+')</span>';
			    	$("#table_names").append("<tr class=\"alternative\" id=\"alternative-"+numAltName+"\"><td>"+label+"</td>" +
			    			"<td><input name=\""+key+"\" type=\"text\" value=\""+tags[key]+"\" id=\"name-edit-"+numAltName+"\" class=\"name_edit\"></td>" +
			    			"<td><a href=\"javascript:removeRow("+numAltName+")\"><img src=\"img/delete.png\"></a></td></tr>");
			    	objectNames[key] = tags[key];
			    	rowLanguages[numAltName] = key;
			    	numAltName++;
			    }
			};
			
			// if the preferred language was set and there is no such translation in the object
			// a line is added
			if($.cookie("prefLang"))
			{
				var key = "name:"+$.cookie("prefLang");
				if(typeof(objectNames[key]) == 'undefined')
				{
					var langLabel = "";
					if($.cookie("prefLang") in LANGUAGE_CODES)
						langLabel += ' <span class="placeDetails">('+LANGUAGE_CODES[$.cookie("prefLang")]+')</span>';
					objectNames[key] = "";
			    	rowLanguages[numAltName] = key;
			    		$("#table_names").append("<tr class=\"alternative\" id=\"alternative-"+numAltName+"\"><td>"+$.cookie("prefLang")+langLabel+"</td>" +
			    			"<td><input name=\""+key+"\" type=\"text\" value=\"\" id=\"name-edit-"+numAltName+"\" class=\"name_edit\"></td>" +
			    			"<td><a href=\"javascript:removeRow("+numAltName+")\"><img src=\"img/delete.png\"></a></td></tr>");
				}
			}
			numAltName++;
			
			// set the "View OSM Object" link
			$("#linkOsmObject").attr("href","http://www.openstreetmap.org/browse/"+type+"/"+id);
			
			setChangeEvents();
			$("#tabs").tabs("enable",1);
			$("#tabs").tabs("select",1);
			$( "#waitDialog" ).dialog('close');
			
//			getProposals(type,id);
		},
		error: function(e){$( "#waitDialog" ).dialog('close');alert(LANG.ERROR_RETRIEVE);}
    });
}

/**
 * Remove a translation row
 * @param num
 */
function removeRow(num)
{
	$("#alternative-"+num).remove();
	delete objectNames[rowLanguages[num]];
	setChangeEvents();
}

/**
 * Called after a language code is chosen, the input text and delete buttons are displayed
 * @param event
 */
function selectLang(event,ui)
{
	if(typeof(ui) != 'undefined')
	{	// If the function was called by the autocoplete event, the value is set
		$("#edit_lang").val(ui.item.value);
	}
	if($("#edit_lang").val().length >= 2)
	{
		if(!("name:"+$("#edit_lang").val() in objectNames))
		{
			$(".name_edit").show();
			$("#link_add_tr").show();
			$("#type-lang-tip").remove();
			typingLanguage = false;
			rowLanguages[numAltName-1] = "name:"+$("#edit_lang").val();
			objectNames["name:"+$("#edit_lang").val()] = "";
			$("#alternative-"+(numAltName-1)+" .name_edit").attr("name","name:"+$("#edit_lang").val());
			var label = $("#edit_lang").val();
			if($("#edit_lang").val() in LANGUAGE_CODES)
				label += ' <span class="placeDetails">('+LANGUAGE_CODES[$("#edit_lang").val()]+')</span>';
			$("#alternative-"+(numAltName-1)+" td").eq(0).html(label);
			$("#alternative-"+(numAltName-1)+" td").eq(1).show();
			$("#alternative-"+(numAltName-1)+" td").eq(2).show();
			// the name edit field is given the focus
			$("#name-edit-"+(numAltName-1)).focus();
		}
		else
			alert(LANG.ERROR_LANG_IN_USE);
	}
}

/**
 * Add a new edit line, only a text input is displayed, to type the languague code
 */
function addLine()
{
	if(!typingLanguage)
	{
		$("#table_names").append("<tr class=\"alternative\" id=\"alternative-"+numAltName+"\"><td><input type=\"text\" id=\"edit_lang\" size=\"10\" maxlength=\"10\"></td>"+
				"<td>" +
					"<span id=\"type-lang-tip\" class=\"placeDetails\">"+LANG.TIP1+" <a href=\""+LANG.TIP_WP_ISO639+"\" target=\"blank\">"+LANG.TIP2+"</a></span>"+
					"<input type=\"text\" id=\"name-edit-"+numAltName+"\" class=\"name_edit\" style=\"display:none\">" +
				"</td>"+
				"<td style=\"display:none\"><a href=\"javascript:removeRow("+numAltName+")\"><img src=\"img/delete.png\"></td></tr>");
		$("#edit_lang").autocomplete({source:ISO639,select:selectLang});
		$("#edit_lang").blur(selectLang);
		$("#edit_lang").focus();
		numAltName++;
		typingLanguage = true;
		$("#link_add_tr").hide();
	}
	setChangeEvents();
}

/**
 * Add a name tag in the tag set, and display the table row with the given value 
 * @param key name tag key
 * @param value name tag key
 */
function displayNameField(key,value)
{
	if(! key in NAME_FIELDS)return;
	objectNames[key] = value;
	$("#row_edit_"+key).show();
	$("#link_set_"+key).hide();
	$("#edit_"+key).val(value);
	setChangeEvents();
}

/**
 * Delete a name tag from the tag set, and hide the table row
 * @param key name tag key
 */
function hideNameField(key)
{
	if(! key in NAME_FIELDS)return;
	delete objectNames[key];
	$("#row_edit_"+key).hide();
	$("#link_set_"+key).show();
	setChangeEvents();
}

/**
 * Retrieve the translation proposals for an object
 * @param type OSM object type
 * @param id OSM object id
 */
function getProposals(type,id)
{
	if(type+id in proposals)
	{
		$("#proposals").empty();
		for(var key in proposals[type+id])
		{
			if($("#proposals").html() == "")
				$("#proposals").append("<b>"+LANG.PROPOSALS+"</b> : ");
			$("#proposals").append('<a href="javascript:insertProposal(\''+type+'\','+id+',\''+key	+'\')">('+key+') '+proposals[type+id][key]+'</a> ');
		}
		$("#proposals").show();
	}
	else
	{
		$("#proposals").hide();
		$.ajax({
			dataType:'json',
			url: "api/osm_iface.php",
			data:{
				'action':'proposalRequest',
				'type':type,
				'id':id	
			},
			success: function(e){
				proposals[type+id] = e;
				getProposals(type,id);
			},
			error:function(e,ts,et){
				alert(arguments.toSource());
			}
		});		
	}
}

/**
 * After the user clicks a translation proposals, a row is inserted or updated with the translation
 * @param type OSM object type
 * @param id OSM object id
 * @param lang the language
 */
function insertProposal(type,id,lang)
{
	var key = "name:"+lang;
	var label = lang;
	if(lang in LANGUAGE_CODES)
		label += ' <span class="placeDetails">('+LANGUAGE_CODES[lang]+')</span>';
	if(!(key in objectNames))
	{
		objectNames[key] = proposals[type+id][lang];
		rowLanguages[numAltName] = key;
		$("#table_names").append("<tr class=\"alternative\" id=\"alternative-"+numAltName+"\"><td>"+label+"</td>" +
				"<td><input name=\""+key+"\" type=\"text\" value=\""+objectNames[key]+"\" id=\"name-edit-"+numAltName+"\" class=\"name_edit\"></td>" +
				"<td><a href=\"javascript:removeRow("+numAltName+")\"><img src=\"img/delete.png\"></a></td></tr>");
		numAltName++;	
	}
	else
	{
		objectNames[key] = proposals[type+id][lang];
		var numRow = 0;
		for(var numIt in rowLanguages)
		{
			if(rowLanguages[numIt] == key)
				numRow = numIt;
		}	
		$("#name-edit-"+numRow).val(objectNames[key]);
	}
}
