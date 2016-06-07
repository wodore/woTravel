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


@API.resource('/api/v1/expense_types')
class ExpenseTypesAPI(Resource):
    """Gets list of expense types. Uses ndb Cursor for pagination. Obtaining expense types is executed
    in parallel with obtaining total count via *_async functions
    """
    def get(self):
        parser = default_parser()
        args = parser.parse_args()
        compare ,date = to_compare_date(args.newer, args.older, args.orderBy)

        query = model.ExpenseType.qry(order_by_date=args.orderBy,  \
            compare_date = compare, date = date, time_offset=args.offset)
        dbs_future = query.fetch_page_async(args.size, start_cursor=args.cursor)

        total_count_future = query.count_async(keys_only=True) if args.total else False
        dbs, next_cursor, more = dbs_future.get_result()
        dbs = [db.to_dict(include=model.ExpenseType.get_public_properties()) for db in dbs]
        total_count = total_count_future.get_result() if total_count_future else False
        return make_list_response(dbs, next_cursor, more, total_count)


@API.resource('/api/v1/expense_types/<string:key>')
class ExpenseTypesByKeyAPI(Resource):
    @model_by_key
    def get(self, key):
        """Loads expense type's properties."""
        if auth.is_admin():
            properties = model.ExpenseType.get_private_properties()
        else:
            properties = model.ExpenseType.get_public_properties()
        return g.model_db.to_dict(include=properties)


    @admin_required
    #@model_by_key
    def put(self, key):
        """Updates expense type's properties"""
        update_properties = ['name', 'description', 'icon_url', 'icon_name', 'added_by','key']
        new_data = _.pick(request.json, update_properties)
        new_data['added_by'] = ndb.Key(urlsafe=new_data['added_by'])
        key = model.ExpenseType.create_or_update(urlsafe=True, **new_data)
        properties = model.ExpenseType.get_public_properties()
        return key.get().to_dict(include=properties)

    @admin_required
    @model_by_key
    def delete(self, key):
        """Deletes expense types"""
        g.model_key.delete()
        return make_empty_ok_response()

