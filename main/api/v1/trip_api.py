# coding: utf-8
# pylint: disable=too-few-public-methods, no-self-use, missing-docstring, unused-argument
"""
Provides API logic relevant to expense types
"""
from flask_restful import reqparse, Resource
from google.appengine.ext import ndb

import auth
import util

from main import API
import model
from api.helpers import ArgumentValidator, make_list_response,\
        make_empty_ok_response, default_parser, to_compare_date
from flask import request, g
from pydash import _
from api.decorators import model_by_key, user_by_username, authorization_required, admin_required, login_required

import datetime

@API.resource('/api/v1/trips')
class TripsAPI(Resource):
    """Get list of trips. The list can either include the full data or just the key to reference models,
    such as expense types, fellow travelers and locations.
    If just the full data are required a parameter is needed:
        - locations (the others depend on this)
        - expenses
        - travelers
    """
    def get(self):
        parser = default_parser()
        parser.add_argument('expenses', type=ArgumentValidator.create('boolTrue'),default=False)
        parser.add_argument('travelers', type=ArgumentValidator.create('boolTrue'),default=False)
        parser.add_argument('locations', type=ArgumentValidator.create('boolTrue'),default=False)
        args = parser.parse_args()
        compare ,date = to_compare_date(args.newer, args.older, args.orderBy)

        query = model.Trip.qry(order_by_date=args.orderBy,  \
            compare_date = compare, date = date, time_offset=args.offset, \
            ancestor=auth.current_user_key())
        dbs_future = query.fetch_page_async(args.size, start_cursor=args.cursor)

        # Count how many results are available (only of prameter total is given!)
        total_count_future = query.count_async(keys_only=True) if args.total else False

        # Get result, this is needed to do the other things.
        dbs, next_cursor, more = dbs_future.get_result()
        # Create already a dictionary, this is used to add data instead of keys
        dbs = [db.to_dict(include=model.Trip.get_public_properties()) for db in dbs]

        # get locations async (only if not only keys are requested)
        if (args.locations):
            locs_future = []
            for db in dbs:
                if db['locations']:
                    locs_future.append(ndb.get_multi_async([ndb.Key(urlsafe=key) for key in db['locations']]))
                else:
                    locs_future.append(None)
            i=0
            for loc_future in locs_future:
                if loc_future: # is a locatio given?
                    locs = [f.get_result() for f in loc_future]
                    locs = [db.to_dict(include=model.Location.get_public_properties()) for db in locs]
                    u=0
                    if (args.expenses or args.travelers or True):
                        for loc in locs:
                            for trans in ['trans_start','trans_end']:
                                wayPt = locs[u][trans].get('waypoints',[])
                                locs[u][trans]['geo'] = wayPt[-1] if len(wayPt) > 0 else None
                            if args.travelers:
                                locs[u]['fellow_travelers'] = [ndb.Key(urlsafe=db).get().to_dict(include=
                                            model.FellowTraveler.get_public_properties())
                                            for db in loc['fellow_travelers']]
                            if args.expenses:
                                #print "Get expenses"
                                #print loc['expenses']
                                locs[u]['expenses'] = [{"amount": e['amount'] if 'amount' in e else 0,
                                                        "note": e['note'] if 'note' in e else "",
                                            "type":ndb.Key(urlsafe=e['type']).get().
                                            to_dict(include=model.ExpenseType.get_public_properties())
                                            if 'type' in e and e['type'] else None} for e in loc['expenses']]
                            u+=1
                    dbs[i]['locations'] = locs
                else: # empty locations
                    dbs[i]['locations'] = []
                i += 1

        #dbs = [db.to_dict(include=model.Trip.get_public_properties()) for db in dbs]
        total_count = total_count_future.get_result() if total_count_future else False
        return make_list_response(dbs, next_cursor, more, total_count)

# TODO check if parent is equal to user OR admin
@API.resource('/api/v1/trips/<string:key>')
class TripsByKeyAPI(Resource):
    @model_by_key
    def get(self, key):
        """Loads expense type's properties."""
        if auth.is_admin():
            properties = model.Trip.get_private_properties()
        else:
            properties = model.Trip.get_public_properties()
        g.model_db.locations = ndb.get_multi(g.model_db.locations)
        i = 0
        for loc in g.model_db.locations:
            g.model_db.locations[i].fellow_travelers = ndb.get_multi(g.model_db.locations[i].fellow_travelers)
            i += 1
        return g.model_db.to_dict(include=properties)


    #@admin_required
    #@ndb.transactional(xg=True)
    #@model_by_key
    @login_required
    def put(self, key): # TODO check and use key if given
        """Updates expense type's properties"""
        update_properties = ['name', 'description', 'avatar_url', 'locations','key']
        new_data = _.pick(request.json, update_properties)
        #new_data['added_by'] = ndb.Key(urlsafe=new_data['added_by'])
        # get trip key (if new)

        print "UPDATE TRIP"
        print new_data
        print "key"
        print new_data.get('key')

        if new_data.get("key","new") == "new" or new_data.get("key") == "add" :
            trip_key = model.Trip.create_or_update(urlsafe=True, parent=auth.current_user_key(), name=new_data['name'])
            new_data['key'] = trip_key.urlsafe();
        else:
            trip_key = ndb.Key(urlsafe=new_data.get("key"))


        # prepare data
        loc_keys = []
        for loc in new_data['locations']:
            user_keys = []
            for user in loc['fellow_travelers']:
                if user.get("new",True):
                    user_keys.append(model.FellowTraveler.create_or_update(urlsafe=True,
                                parent=auth.current_user_key(),
                                added_by=auth.current_user_key(),
                                **user))
                else:
                    user_keys.append(ndb.Key(urlsafe=user.get("key",False)))
            loc['fellow_travelers'] = user_keys
            start_date = datetime.datetime.strptime(loc['start_datetime'][0:19],"%Y-%m-%dT%H:%M:%S") if loc.get('start_datetime',False) else None
            end_date = datetime.datetime.strptime(loc['end_datetime'][0:19],"%Y-%m-%dT%H:%M:%S") if loc.get('end_datetime',False) else None
            print "Dates are:"
            print start_date
            print end_date
            loc['start_datetime'] = start_date
            loc['end_datetime'] = end_date
            loc['trip'] = trip_key
            if loc['geo']:
                loc['geo'] =  ndb.GeoPt(lat=loc['geo']['lat'],lon=loc['geo']['lng'])
            print "SAVE EXPENSES"
            if loc['expenses']:
                loc['expenses'] = [{"amount":float(e.get('amount',0) or 0),
                    "note":e.get('note',""),
                    "type":ndb.Key(urlsafe=e['type']) if e.get('type',False) else None} for e in loc['expenses']]
            print loc['expenses']
            if 'trans_start' in loc:
                loc['trans_start']['waypoints'] = [ndb.GeoPt(lat=m.get('lat'),lon=m.get('lng')) for m in loc['trans_start'].get('waypoints',[])]
            if 'trans_end' in loc:
                loc['trans_end']['waypoints'] = [ndb.GeoPt(lat=m.get('lat'),lon=m.get('lng')) for m in loc['trans_end'].get('waypoints',[])]
            #loc['trans_end']['waypoints'] = [ndb.GetPt(lat=m.lat,lon=m.lng) for m in loc.trans_end.get('waypoints',[])[])]
            if loc.get("new",True):
                print "Save/update location"
                loc_keys.append(model.Location.create_or_update(urlsafe=True,\
                                parent=auth.current_user_key(), **loc))
            else:
                print "Don't save/update location (not changes)"
                loc_keys.append(ndb.Key(urlsafe=loc.get("key",False)))
        new_data['locations'] = loc_keys
        key = model.Trip.create_or_update(urlsafe=True, parent=auth.current_user_key(), **new_data)
        properties = model.Trip.get_public_properties()
        return key.get().to_dict(include=properties)

    @admin_required
    @model_by_key
    def delete(self, key):
        """Deletes expense types"""
        g.model_key.delete()
        return make_empty_ok_response()

