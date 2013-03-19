var fm_key, fm_url, fm_user;
var state_auth = 0;
var groups = {};
var feeds = {};
var feeds_groups = {};
var favicons = {};
var items = [];

function start() {
	// Load Config, if any
	getSettings();
	// Check, if we have all the auth-data

	// test-auth
	$.post(fm_url + "?api", { api_key: fm_key }).done(function(data) {
		
		if ( data.auth && data.auth == 1 ) {
			state_auth = data.auth;
			// Get groups and build them
			$.post(fm_url + "?api&groups", { api_key: fm_key }).done(function(data) {
				if (data.auth != 1 ) {
					console.log("Auth-Error");
					return;
				}
				groups = _.sortBy(data.groups, "title");
				feeds_groups = data.feeds_groups;
				createGroups(false);
			});

			$.post(fm_url + "?api&feeds", { api_key: fm_key }).done(function(data) {
				feeds = data.feeds;
			});
	
			refreshItems();
			
		} else {
			console.log("Forbidden");
			$.mobile.navigate("#page-settings");
			alert("Forbidden!");
		}
	
	}).fail(function(){
		console.log("Forbidden");
		$.mobile.navigate("#page-settings");
	});
	
}

function refreshItems() {
	$.post(fm_url + "?api&unread_item_ids", { api_key: fm_key }).done(function(data) {
		var ids = data.unread_item_ids.split(',');
		//console.log(ids);
		items = [];
		loadItems(ids);
	});
}

function loadItems(ids) {

	// Fever-API allows to get a maximum of 50 links per request, we need to split it, obviously
	//console.log(placeholder_ids.length);
	if ( ids.length > 20 ) {
		var first = _.first(ids, 20);
		var rest  = _.rest(ids, 20);
	} else {
		var first = ids;
		var rest = [];
	}
	var get_ids = first.join(",");
	$.post(fm_url + "?api&items&with_ids="+ _.escape(get_ids), { api_key: fm_key }).done(function(data) {
		$.each(data.items, function(index, value) {
			// Save each item in
			//console.log(value);
			var group_id = getGroupID(value.feed_id);
			value.group_id = group_id;
			value.favicon_id = 0;
			items.push(value);
		});
		
	});
	
	if ( rest.length > 0 ) {
		//console.log(rest.length + " to go");
		loadItems(rest);
	} else {
		// finished
		//console.log(items);
		
	}
	
}
function getGroupID(feed_id) {

}

function createGroups(refresh) {	
	if ( refresh == true ) {
		$.post(fm_url + "?api&groups", { api_key: fm_key }).done(function(data) {
			if (data.auth != 1 ) {
				console.log("Auth-Error");
				return;
			}
			groups = _.sortBy(data.groups, "title");
			feeds_groups = data.feeds_groups.split(",");
			createGroups(false);	
		});
	} else {
		$("#fmjs-groups").empty();
		$("#fmjs-groups").listview( "refresh" );
		$.each( groups, function(index, value) {
			var item = '<li data-theme="c" id="fmjs-group-'+value.id+'"><a href="#page-group" onclick="showGroup('+value.id+');" data-transition="slide">'+ _.escape(value.title) +'</a></li>';
			$("#fmjs-groups").append(item);
		});
	
		$("#fmjs-groups").listview( "refresh" );
	}
}



function getSettings() {
	if ( $.jStorage.storageAvailable() ) {
		fm_key   = $.jStorage.get("fmjs-key", "none");
		fm_url   = $.jStorage.get("fmjs-url", "none");
		fm_user  = $.jStorage.get("fmjs-user", "none");
		favicons = $.jStorage.get("fmjs-favicons");
		
		if ( fm_url != "none" ) {
			$("#fmjs-fever-url").val(fm_url);
		}
		if ( fm_user != "none" ) {
			$("#fmjs-e-mail").val(fm_user);
		}
		
	} else {
		return false;
	}
}

function saveSettings() {
	var url, user, password;
	url      = $("#fmjs-fever-url").val();
	user     = $("#fmjs-e-mail").val();
	password = $("#fmjs-password").val();

	if ( $.jStorage.storageAvailable() ) {
		$.jStorage.set("fmjs-url", url);
				
		if ( password != "" ) {
			key = MD5(user + ":" + password);
			$.jStorage.set("fmjs-user", user);
			$.jStorage.set("fmjs-key", key);
		}
		console.log("Saved");
	} else {
		return false;
	}
	start();
}


function showSaved() {
	//$("#fmjs-saved-content").html("");
	//$("#fmjs-saved-content").listview();
	$.post(fm_url + "?api&saved_item_ids", { api_key: fm_key }).done(function(data) {
		if (data.auth != 1 ) {
			console.log("Auth-Error");
			return;
		}
		$("#fmjs-saved-content").empty();
		$("#fmjs-saved-content").listview("refresh");
		if ( data.saved_item_ids != "") {
			//console.log(data.saved_item_ids);
			$.post(fm_url + "?api&items&with_ids=" + data.saved_item_ids, { api_key: fm_key }).done(function(data) {
				var sorted = _.sortBy(data.items, "created_on_time");
				$.each(sorted, function(index, value) {
					if ( value.is_saved == "1" ) {
						var item = "";
						item += '<li data-theme="c">';
						item += '<a href="#page-single" onclick="showSingleItem('+value.id+')">' + value.title + '</a>';
						item += '</li>';
						$("#fmjs-saved-content").append(item);
					}
				});
				
				$("#fmjs-saved-content").listview("refresh");
			});
			
			
		}
	});
}

function showHot(page) {
	console.log("Requested hot page: "+page);
	if ( page == 1 ) {
		// First page has been called, so do a complete refresh
		$("#fmjs-hot-content").empty();
		$("#fmjs-hot-more").attr("onclick", "showHot(2)");
	} else {
		// another page has been called, so let's append a new one
		var next_page = page;
		next_page++;
		$("#fmjs-hot-more").attr("onclick", "showHot("+next_page+")");
	}
	
	// Set range and offset
	
	var range  = $("#fmjs-hot-range :selected").attr("value");
	var offset = $("#fmjs-hot-offset :selected").attr("value");
	
	console.log("Range: "+range);
	console.log("Offset: "+offset);
	
	$.post(fm_url + "?api&links&offset="+offset+"&range="+range+"&page="+page, { api_key: fm_key }).done(function(data) {
		if (data.auth != 1 ) {
			console.log("Auth-Error");
			return;
		}
		load_ids = '';
		//$("#fmjs-hot-content").html("");
		$.each(data.links, function(index, value) {
			//console.log("Link: "+value.id);
			var item = '';
			var id_list = '';
			load_ids += value.item_ids + ',';
			item += '<div>';
			item += '<h2>';
			item += _.escape( value.temperature ) + '<span style="color:red">°</span>&nbsp;';
			item += '<a href="'+value.url+'" target="_blank">'+_.escape(value.title)+'</a>';
			item += '</h2>';
			
			if (value.is_local == 1 ) {
				// Add local stuff here, like excerpt an feed name.
				// We'll add that later for now.
				// Special aspect here: We might add a link to fever mobile single item view
				// Not tricky, but ui should be ok for that
				//console.log("Local item");
			}
			
			// Now we show a list of all those items, linking to this hot item...
			//item += '<p>' + value.item_ids+'</p>'; // we remove this line later
			item += '<ul data-role="listview" data-divider-theme="d" data-inset="true" id="fmjs-hot-content-link-'+value.id+'" class="fmjs-hot-linkbox">';
			//console.log(value.item_ids);
			var links = value.item_ids.split(',');
			for (var i=0, link_id; link_id=links[i]; i++) {
				// item is "some", then "example", then "array"
				// i is the index of item in the array
				item += '<li><p><a href="#page-single" class="fmjs-link-'+link_id+'" onclick="showSingleItem('+link_id+');"><span class="fmjs-link-'+link_id+'-title">Link: '+link_id+'</span></a> by <span class="fmjs-link-'+link_id+'-feedname">Feed</span></p></li>';
				id_list += link_id + ",";
			}	
			item += '</ul>';
			//
			item += '<div style="text-align:right"><a href="" data-role="button" onclick="markItemsRead(\''+id_list+'\');">Mark Links as read</a></div>';
			//
			item += '</div>';
			$("#fmjs-hot-content").append(item);
			$("#fmjs-hot-content-link-"+value.id).listview();

		});	
		
		
		var ids_to_get = load_ids.split(',');
		//console.log(ids_to_get.length);
		ids_to_get = _.uniq(ids_to_get);
		//console.log(ids_to_get.length);
		fillLinkPlaceholder(ids_to_get, 'link' );
		$(".fmjs-hot-linkbox").listview("refresh");
	});
}

function fillLinkPlaceholder(placeholder_ids, class_prefix) {
	// Fever-API allows to get a maximum of 50 links per request, we need to split it, obviously
	//console.log(placeholder_ids.length);
	if ( placeholder_ids.length > 20 ) {
		var first = _.first(placeholder_ids, 20);
		var rest  = _.rest(placeholder_ids, 20);
	} else {
		var first = placeholder_ids;
		var rest = [];
	}
	var get_ids = first.join(",");
	$.post(fm_url + "?api&items&with_ids="+ _.escape(get_ids), { api_key: fm_key }).done(function(data) {
		$.each(data.items, function(index, value) {
			$(".fmjs-"+class_prefix+"-"+value.id+"-title").html(_.escape(value.title));
			if ( value.is_read == 0 ) {
				$(".fmjs-"+class_prefix+"-"+value.id+"-title").addClass("fmjs-item-is-unread");
			}
			//$("#fmjs-link-"+link_id).attr("href",_.escape(data.url));
			var feedname = _.where(feeds, {id: value.feed_id});
			//items.push(value);
			$(".fmjs-"+class_prefix+"-"+value.id+"-feedname").html('<a href="#page-feed" onclick="showFeed('+$.trim(feedname[0].id)+');">'+_.escape(feedname[0].title)+'</a>');
		});
		
	});
	
	if ( rest.length > 0 ) {
		fillLinkPlaceholder(rest, class_prefix);
	}
}

function showGroup(id) {
	//var entries = _.where(items, {feed_id: id});
	//console.log(items);
	$("#fmjs-group").empty();
	var feeds_to_show = feeds_groups;
	//console.log(feeds_to_show);
	var ids_to_show = _.where(feeds_groups, {group_id: id});
	
	feeds_to_show = ids_to_show[0].feed_ids.split(",");
	//console.log(feeds_to_show);
	$.each(items, function(index, value) {
		console.log(feeds_to_show);
		if ( $.inArray(value.feed_id, feeds_to_show ) !== false ) {
		
			var item = "";
			item += '<li data-theme="c">';
			item += '<a href="#page-single" onclick="showSingleItem('+value.id+')">' + value.title + '</a>';
			item += '</li>';
			$("#fmjs-group").append(item);
		}
	});
	
	$("#fmjs-group").listview("refresh");
}

function showFeed(id) {
	//$("#fmjs-feed-view").listview();
	//$("#fmjs-feed-view").empty();
	var feed_info = _.where(feeds, {id: id});
	
	//console.log(items);
	$("#fmjs-feed-header").html(feed_info[0].title);
	
	//$("#fmjs-feed-content").append('');
		
	var items_to_show = _.where(items, {feed_id: id});
	//console.log(items_to_show);
	$.each(items_to_show, function(index, value) {
		//console.log(value.feed_id);
		if ( value.is_read == "0" ) {
			var item = "";
			item += '<li data-theme="c">';
			item += '<a href="#page-single" onclick="showSingleItem('+value.id+');">' + value.title + '</a>';
			item += '</li>';
			$("#fmjs-feed-view").append(item);
		}
	});

	$("#fmjs-feed-view").listview("refresh");

}


function refreshFavicons() {
	$.post(fm_url + "?api&favicons", { api_key: fm_key }).done(function(data) {
		favicons = data.favicons;
		favicons = $.jStorage.set("fmjs-favicons", favicons);
		console.log("Favicons refreshed");
	});
}

function showSingleItem(id) {
	$.post(fm_url + "?api&items&with_ids="+ _.escape(id), { api_key: fm_key }).done(function(data) {
		//console.log(data.items);
		$("#fmjs-single-content").html(data.items[0].html);
		$("#fmjs-single-title").html(_.escape(data.items[0].title));
		$("#fmjs-single-author").html(_.escape(data.items[0].author));
		$("#fmjs-single-url").attr("href", data.items[0].url);
		
		var feedname = _.where(feeds, {id: data.items[0].feed_id});
		//console.log(feedname[0].favicon_id);
		$("#fmjs-feed-title").html(_.escape(feedname[0].title));
		$("#fmjs-single-feedname").html(_.escape(feedname[0].title));
		markItemRead(id);

	});
}

function markItemsRead(ids) {
	if ( _.isArray(ids) ) {
		// An array of ids
		$.each(ids, function(index, value) {
			markItemRead(value);
		});
	} else {
		// a comma seperated string
		var ids_split = ids.split(",");
		//console.log(ids_split);
		$.each(ids_split, function(index, value) {
			markItemRead(value);
		});
	}
}

function markItemRead(id) {
	if ( $.trim(id) != "") {
		$.post(fm_url + "?api", { api_key: fm_key, mark: "item", as: "read", id: $.trim(_.escape(id))  }).done(function(data) {
			console.log("Marked as read");
		});
	}
}
