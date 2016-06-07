# coding: utf-8
"""Provides implementation of Base model and BaseValidator"""

from __future__ import absolute_import
from google.appengine.ext import ndb

import config
#from datetime import date
import datetime
from pydash import _
import util


class BaseValidator(object):
    """Base factory class for creating validators for ndb.Model properties
    To be able to create validator for some property, extending class has to
    define attribute which has to be one of these:
        list - with 2 elements, determining min and max length of string
        regex - which will be validated agains string
        function - validation function

    After defining attributes we will be able to create respective validator functions.

    Examples:
        Let's say we want to create validator factory for our new model
        class MySuperValidator(BaseValidator):
            short_name = [2, 4]

        Now if we call MySuperValidator.create('short_name') it returns
         function, which will throw error of string is not between 2-4 chars
         The same goes with if short_name was regex, and if it was function,
         the function itself is returned as validator

     Creating validation functions this way is useful for passing it as
     'validator' argument to ndb.Property constructor and also passing it as 'type'
     argument to reqparse.RequestParser, when adding argument via add_argument
    """

    @classmethod
    def create(cls, name, required=True):
        """Creates validation function from given attribute name

        Args:
            name (string): Name of attribute
            required (bool, optional) If false, empty string will be always accepted as valid

        Returns:
            function: validation function
        """
        attr = getattr(cls, name)
        if _.is_list(attr):
            return util.create_validator(lengths=attr, required=required)
        elif _.is_string(attr):
            return util.create_validator(regex=attr, required=required)
        elif _.is_function(attr):
            return attr

    @classmethod
    def to_dict(cls):
        """Creates dict out of list and regex attributes, so it can be passed to angular
            for frontend validation

            Returns:
                dict:
        """
        result = {}
        for attr_name in _.reject(set(dir(cls)), lambda x: x.startswith('_')):
            attr = getattr(cls, attr_name)
            if _.is_list(attr) or _.is_string(attr):
                result[attr_name] = attr
        return result


class Base(ndb.Model):
    """Base model class, it should always be extended

    Attributes:
        created (ndb.DateTimeProperty): DateTime when model instance was created
        modified (ndb.DateTimeProperty): DateTime when model instance was last time modified
        version (ndb.IntegerProperty): Version of app

        PUBLIC_PROPERTIES (list): list of properties, which are accessible for public, meaning non-logged
            users. Every extending class should define public properties, if there are some
        PRIVATE_PROPERTIES (list): list of properties accessible by admin or authrorized user
    """
    created = ndb.DateTimeProperty(auto_now_add=True)
    modified = ndb.DateTimeProperty(auto_now=True)
    version = ndb.IntegerProperty(default=config.CURRENT_VERSION_TIMESTAMP)

    PUBLIC_PROPERTIES = ['key', 'version', 'created', 'modified']
    PRIVATE_PROPERTIES = []

    def to_dict(self, include=None):
        """Return a dict containing the entity's property values,
        so it can be passed to client

        Args:
            include (list, optional): Set of property names to include,
                default all properties.
                For nested elements the list can use a dict:
                    eg.
                        ['name','description,{'tags':['name','count']}]
        """
        repr_dict = {}
        if include is None:
            include = _.keys(self._properties)
            #return super(Base, self).to_dict(include=include)

        def to_value(attr,name_str, name=None):
            if isinstance(attr, datetime.date):
                return attr.isoformat()
            elif isinstance(attr, ndb.Key):
                if name_str == 'key':
                    return self.key.urlsafe()
                else:
                    return attr.urlsafe()
            elif isinstance(attr, ndb.GeoPt):
                return {'lat':attr.lat,
                        'lng': attr.lon,
                        'lon': attr.lon}
            elif hasattr(attr, '__iter__'):    # iterable, not string
                return [to_value(a,name_str,name) for a in attr]
            elif hasattr(attr, 'to_dict'):    # hooray for duck typing!
                incl = None if not isinstance(name,dict) else name[name_str]
                return attr.to_dict(include=incl)
            else:
                return attr

        for name in include:
            name_str = name if not isinstance(name,dict) else name.keys()[0]
            attr = getattr(self, name_str)
            repr_dict[name_str] = to_value(attr,name_str,name)
            if name_str == 'key':
                repr_dict['id'] = self.key.id()
        return repr_dict

    def populate(self, **kwargs):
        """Extended ndb.Model populate method, so it can ignore properties, which are not
        defined in model class without throwing error
        """
        kwargs = _.omit(kwargs, Base.PUBLIC_PROPERTIES + ['key', 'id'])  # We don't want to populate those properties
        kwargs = _.pick(kwargs, _.keys(self._properties))  # We want to populate only real model properties
        super(Base, self).populate(**kwargs)

    @classmethod
    def get_by(cls, name, value):
        """Gets model instance by given property name and value"""
        return cls.query(getattr(cls, name) == value).get()

    @classmethod
    def get_public_properties(cls):
        """Public properties consist of this class public properties
        plus extending class public properties"""
        return cls.PUBLIC_PROPERTIES + Base.PUBLIC_PROPERTIES

    @classmethod
    def get_private_properties(cls):
        """Gets private properties defined by extending class"""
        return cls.PRIVATE_PROPERTIES + Base.PRIVATE_PROPERTIES + cls.get_public_properties()

    @classmethod
    def get_all_properties(cls):
        """Gets all model's ndb properties"""
        return ['key', 'id'] + _.keys(cls._properties)

    @classmethod
    def id_to_key(cls,id):
        """Returns key from an id """
        try:
            id = long(id)
        except ValueError:
            pass  # it was a string, not an int.
        return ndb.Key(cls._get_kind(),id)

    @classmethod
    @ndb.transactional
    def get_or_create(cls, key, urlsafe=False, **kwargs):
        """Get or create a ndb DB. It returns a list, first
        is the entity, second a boolean which tells you if
        it was created or not.

        For this function the key needs to be set!

        Returns
            (db, new)
        """
        if urlsafe:
            key = ndb.Key(urlsafe=key)
        ent = key.get()
        if ent is not None:
            return (ent, False)  # False meaning "not created"
        ent = cls(**kwargs)
        ent.key = key
        ent.put()
        return (ent, True)  # True meaning "created"

    @classmethod
    def create_or_update(cls,key=None, urlsafe=False, parent=None, **kwargs):
        """ Updates an entity or creates a new one.
        If key is None it creates a new entity, if key is set it gets it.

        Returns
            key
        """
        def omit(data, omit_list):
            values = {}
            for k, v in data.iteritems():
                if isinstance(v, dict):    # iterable, not string
                    values[k] = omit(v,omit_list)
                elif k not in omit_list:
                    values[k] = v
            return  values
        print "CREATE OR UPDATE"
        print cls

        if key:
            print "GOT key"
            print key
            if urlsafe:
                print "User urlsave"
                key = ndb.Key(urlsafe=key)
                print key
            db = key.get()
            print kwargs
            kwargs = omit(kwargs, Base.PUBLIC_PROPERTIES + ['key', 'id'])  # We don't want to populate those properties
            print "kwargs after omiting"
            print "============================="
            print kwargs
            db.populate(**kwargs)
        else:
            print "Save new one"
            print "properties are:"
            print _.keys(cls._properties)
            # We don't want to populate those properties
            kwargs = omit(kwargs, Base.PUBLIC_PROPERTIES + ['key', 'id'])
            # We want to populate only real model properties
            kwargs = _.pick(kwargs, _.keys(cls._properties))
            # TODO should be deep!
            print "____________________________________"
            print "kwargs"
            print kwargs
            db = cls(parent=parent,**kwargs)
        key = db.put()
        return key


    @classmethod
    def qry(cls, entity, order_by_date='-modified', compare_date=None,
                        date=None, time_offset=None,
                        compare_version=None, version=None,
                        **kwargs):
        """Base query, this can be used for mor complex queries.

        order_by_date can be either: '-modified', 'modified',
                                     '-created', 'created', or None (no order)
        compare_date can be : '>modified', '<modified', '>created', '<created',
                              '>=modified', '<=modified', '>=created', '<=created',
                              or None

        if compare_date is set a date is needed which is used to compare to.

        date : Is either a datetime.datetime object or a string (Y-m-d H:M:S)
        time_offset : An offset to the given date in seconds (eg. -30: minus 30 seconds)

        compare_version can be : '>', '<', '>=', '<=', '==', or None
        version needs to be a version timestamp (integer).

                                     """
        qry = entity.query(**kwargs)
        if order_by_date == '-modified':
            qry = qry.order(-cls.modified)
        elif order_by_date == 'modified':
            qry = qry.order(cls.modified)
        elif order_by_date == 'created':
            qry = qry.order(cls.created)
        elif order_by_date == '-created':
            qry = qry.order(-cls.created)

        if date:
            if isinstance(date, basestring):
                date = datetime.datetime.strptime(date,"%Y-%m-%d %H:%M:%S")
            if time_offset:
                date = date + datetime.timedelta(seconds=int(time_offset))
            if compare_date == '>modified' :
                qry = qry.filter(cls.modified > date)
            elif compare_date == '>=modified' :
                qry = qry.filter(cls.modified >= date)
            elif compare_date == '<modified' :
                qry = qry.filter(cls.modified < date)
            elif compare_date == '<=modified' :
                qry = qry.filter(cls.modified <= date)
            elif compare_date == '>created' :
                qry = qry.filter(cls.created > date)
            elif compare_date == '>=created' :
                qry = qry.filter(cls.created >= date)
            elif compare_date == '<created' :
                qry = qry.filter(cls.created < date)
            elif compare_date == '<=created' :
                qry = qry.filter(cls.created <= date)

        if version:
            if compare_version == '>' :
                qry = qry.filter(cls.version > version)
            elif compare_version == '>=' :
                qry = qry.filter(cls.version >= version)
            elif compare_version == '<' :
                qry = qry.filter(cls.version < version)
            elif compare_version == '<=' :
                qry = qry.filter(cls.version <= version)
            elif compare_version == '==' :
                qry = qry.filter(cls.version == version)
        return qry


