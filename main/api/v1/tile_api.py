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
from api.decorators import model_by_key, user_by_username, authorization_required, admin_required


@API.resource('/api/v1/tiles')
class TilesAPI(Resource):
    """Gets list of tiles. Uses ndb Cursor for pagination. Obtaining tiles is executed
    in parallel with obtaining total count via *_async functions
    """
    def get(self):
        parser = default_parser()
        parser.add_argument('active', type=ArgumentValidator.create('boolTrue'),default=False)
        args = parser.parse_args()
        compare ,date = to_compare_date(args.newer, args.older, args.orderBy)

        query = model.Tile.qry(order_by_date=args.orderBy,  \
            compare_date = compare, date = date, time_offset=args.offset, \
            active=args.active)
        dbs_future = query.fetch_page_async(args.size, start_cursor=args.cursor)

        total_count_future = query.count_async(keys_only=True) if args.total else False
        dbs, next_cursor, more = dbs_future.get_result()
        dbs = [db.to_dict() for db in dbs]
        total_count = total_count_future.get_result() if total_count_future else False
        return make_list_response(dbs, next_cursor, more, total_count)


@API.resource('/api/v1/tiles/<string:key>')
class TilesByKeyAPI(Resource):
    @model_by_key
    def get(self, key):
        """Loads expense type's properties."""
        if auth.is_admin():
            properties = model.Tile.get_private_properties()
        else:
            properties = model.Tile.get_public_properties()
        return g.model_db.to_dict(include=properties)


    @admin_required
    #@model_by_key
    def put(self, key):
        """Updates expense type's properties"""
        #update_properties = ['name', 'description', 'icon_url', 'icon_name', 'added_by','key']
        #new_data = _.pick(request.json, update_properties)
        new_data = request.json
        #new_data['added_by'] = ndb.Key(urlsafe=new_data['added_by'])
        key = model.Tile.create_or_update(urlsafe=True, **new_data)
        properties = model.Tile.get_all_properties()
        return key.get().to_dict(include=properties)

    @admin_required
    @model_by_key
    def delete(self, key):
        """Deletes expense types"""
        g.model_key.delete()
        return make_empty_ok_response()

