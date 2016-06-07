# coding: utf-8
"""Provides implementation of User model and User"""
from __future__ import absolute_import

from google.appengine.ext import ndb
import model
import util


class ExpenseTypeValidator(model.BaseValidator):
    """Defines how to create validators for user properties. For detailed description see BaseValidator"""
    name = [0, 20]
    description = [0, 150]

class ExpenseType(model.Base):
    """A class describing datastore users."""
    name = ndb.StringProperty(required=True,default='', validator=ExpenseTypeValidator.create('name'))
    description = ndb.StringProperty(indexed=False, validator=ExpenseTypeValidator.create('description'))
    # either give a icon url (to an uploaded icon) or a icon name of an existing material icon
    icon_url = ndb.StringProperty(default='',required=False, indexed=False)
    icon_name = ndb.StringProperty(default='',required=False, indexed=False)
    added_by = ndb.KeyProperty(kind="User",required=True) # the user which added this expense type
    default = ndb.BooleanProperty(default=False,required=True)
    PUBLIC_PROPERTIES = ['icon_url', 'icon_name','name', 'description','default']

    PRIVATE_PROPERTIES = ['added_by']

    @classmethod
    def qry(cls, name=None, added_by=None, default=None, **kwargs):
        """Query for fellow-travelers"""
        qry = model.Base.qry(model.ExpenseType,**kwargs)
        if name:
            qry = qry.filter(cls.name==name)
        if added_by:
            qry = qry.filter(cls.added_by==added_by)
        return qry



