# coding: utf-8
# pylint: disable=too-few-public-methods, no-self-use, missing-docstring, unused-argument
"""
Provides API logic relevant to expense types
"""
import logging

from flask_restful import reqparse, Resource
from google.appengine.ext import ndb

import auth
import util

from main import API
import model
from api.helpers import ArgumentValidator, make_list_response,\
        make_empty_ok_response, default_parser, to_compare_date,\
        make_not_found_exception
from flask import request, g
from pydash import _
from api.decorators import model_by_key, user_by_username, authorization_required, admin_required, login_required

from piplapis.search import SearchAPIRequest

@API.resource('/api/v1/fellow_travelers')
class FellowTravelerAPI(Resource):
    """Gets list of expense types. Uses ndb Cursor for pagination. Obtaining expense types is executed
    in parallel with obtaining total count via *_async functions
    """
    def get(self):
        parser = default_parser()
        args = parser.parse_args()
        compare ,date = to_compare_date(args.newer, args.older, args.orderBy)

        query = model.FellowTraveler.qry(order_by_date=args.orderBy,  \
            compare_date = compare, date = date, time_offset=args.offset)
        dbs_future = query.fetch_page_async(args.size, start_cursor=args.cursor)

        total_count_future = query.count_async(keys_only=True) if args.total else False
        dbs, next_cursor, more = dbs_future.get_result()
        dbs = [db.to_dict(include=model.FellowTraveler.get_public_properties()) for db in dbs]
        total_count = total_count_future.get_result() if total_count_future else False
        return make_list_response(dbs, next_cursor, more, total_count)


@API.resource('/api/v1/fellow_travelers/<string:key>')
class FellowTravelerByKeyAPI(Resource):
    @model_by_key
    @admin_required
    def get(self, key):
        """Loads expense type's properties."""
        if auth.is_admin():
            properties = model.FellowTraveler.get_private_properties()
        else:
            properties = model.FellowTraveler.get_public_properties()
        return g.model_db.to_dict(include=properties)


    @admin_required
    #@model_by_key
    def put(self, key):
        """Updates expense type's properties"""
        update_properties = ['name', 'description', 'avatar_url', 'icon_name', 'added_by','key']
        new_data = _.pick(request.json, update_properties)
        new_data['added_by'] = ndb.Key(urlsafe=new_data['added_by'])
        key = model.FellowTraveler.create_or_update(urlsafe=True, **new_data)
        properties = model.FellowTraveler.get_public_properties()
        return key.get().to_dict(include=properties)

    @admin_required
    @model_by_key
    def delete(self, key):
        """Deletes expense types"""
        g.model_key.delete()
        return make_empty_ok_response()

@API.resource('/api/v1/fellow_travelers/social/<string:qry>')
class FellowTravelerSocialSuggestions(Resource):
    @login_required
    def get(self, qry):
        """Suggests social account details."""
        keys = ["SOCIAL-DEMO-zakph6vuwl5wsh90x84gym9q",
        "SOCIAL-PREMIUM-DEMO-6qvbtgm2dqi3ojycwqd6qhnk",
        "BUSINESS-PREMIUM-DEMO-3oe7f5j3itet1li5bkzjfh7j",
        "BUSINESS-DEMO-w0vpyw93cc1tgjhacj7wgjiv"]
        #users = []
        #users.append({"name":qry,
                    #"avatar_url":""})
        res = model.AvatarSuggestionCache.get(qry)
        if res:
            print "HIT avatar suggestion cache"
            return res
        print "MISS avatar suggestion cache"
        images = []
        emails = []
        response = False
        if len(qry) > 4:
            for key in keys:
                request = SearchAPIRequest(raw_name=qry,
                            match_requirements="(name and image)" ,
                            api_key=key)
                try:
                    response = request.send()
                    break
                except:
                    logging.error("Request error for pipl.com")
                    raise ValueError('Not data found')
            if response:
                for person in response.possible_persons:
                    #print person.__dict__
                    try:
                        name = person.names[0].first
                        name += " "+person.names[0].last
                        for img in person.images:
                            images.append({"name":name,
                                        "url":img.url})
                        for email in person.emails:
                            emails.append({"name":name,
                                        "email":email.address})
                        #users.append({"name":name,
                        #            "avatar_url":person.images[0].url})
                    except:
                        pass
        res = {'emails' : emails,
                'images' : images}
        model.AvatarSuggestionCache.set(qry,res)
        return res
        #return make_list_response(res, False, False, len(res['images']))


@API.resource('/api/v1/fellow_travelers/suggestions')
class FellowTravelerSuggestions(Resource):
    @login_required
    def get(self):
        """Loads expense type's properties."""
        parser = default_parser()
        parser.add_argument('q',default="")
        args = parser.parse_args()
        qry = args.q.lower()
        #compare ,date = to_compare_date(args.newer, args.older, args.orderBy)
        gae_qry = model.FellowTraveler.qry(added_by=auth.current_user_key(),order_by_date=False)
        if len(qry) > 0:
            gae_qry = gae_qry \
                .filter(model.FellowTraveler.tags >= qry) \
                .filter(model.FellowTraveler.tags <= unicode(qry) + u"\ufffd")\
                .order(model.FellowTraveler.tags)
        else:
            gae_qry = model.FellowTraveler.qry(added_by=auth.current_user_key(),order_by_date="-modified")
        dbs =  gae_qry.fetch(limit=args.size)

        users = []
        if dbs:
            for db in dbs:
                users.append(db.to_dict(include=model.FellowTraveler.get_public_properties()))
                users[len(users)-1]["new"] = False
        users.append({"name":args.q, "avatar_url":"","new":True})

        return make_list_response(users, False, False, len(users))


