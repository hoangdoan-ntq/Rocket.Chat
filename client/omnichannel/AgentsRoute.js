
import { useDebouncedValue, useMediaQuery, useMutableCallback } from '@rocket.chat/fuselage-hooks';
import React, { useMemo, useCallback, useState } from 'react';
import { Box, Table, Icon } from '@rocket.chat/fuselage';

import { Th } from '../components/GenericTable';
import { useTranslation } from '../contexts/TranslationContext';
import { useEndpointDataExperimental } from '../hooks/useEndpointDataExperimental';
import { useEndpointAction } from '../hooks/useEndpointAction';
import { usePermission } from '../contexts/AuthorizationContext';
import NotAuthorizedPage from '../components/NotAuthorizedPage';
import ManageAgents from './agentManager/ManageAgents';
import AgentEdit from './agentManager/AgentManagerEdit';
import AgentInfo from './agentManager/AgentInfo';
import UserAvatar from '../components/basic/avatar/UserAvatar';
import { useRouteParameter, useRoute } from '../contexts/RouterContext';
import VerticalBar from '../components/basic/VerticalBar';

export function RemoveAgentButton({ _id, reload }) {
	const deleteAction = useEndpointAction('DELETE', `livechat/users/agent/${ _id }`);

	const handleRemoveClick = useMutableCallback(async (e) => {
		e.preventDefault();
		const result = await deleteAction();
		if (result.success === true) {
			reload();
		}
	});

	return <Table.Cell fontScale='p1' color='hint' onClick={handleRemoveClick} withTruncatedText><Icon name='trash' size='x20'/></Table.Cell>;
}

export function AgentInfoActions({ reload }) {
	const t = useTranslation();
	const _id = useRouteParameter('id');
	const agentsRoute = useRoute('omnichannel-agents');
	const deleteAction = useEndpointAction('DELETE', `livechat/users/agent/${ _id }`);

	const handleRemoveClick = useMutableCallback(async () => {
		const result = await deleteAction();
		if (result.success === true) {
			agentsRoute.push({});
			reload();
		}
	});

	const handleEditClick = useMutableCallback(() => agentsRoute.push({
		context: 'edit',
		id: _id,
	}));

	return [
		<AgentInfo.Action key={t('Remove')} title={t('Remove')} label={t('Remove')} onClick={handleRemoveClick} icon={'trash'} />,
		<AgentInfo.Action key={t('Edit')} title={t('Edit')} label={t('Edit')} onClick={handleEditClick} icon={'edit'} />,
	];
}

const sortDir = (sortDir) => (sortDir === 'asc' ? 1 : -1);

const useQuery = ({ text, itemsPerPage, current }, [column, direction]) => useMemo(() => ({
	fields: JSON.stringify({ name: 1, username: 1, emails: 1, avatarETag: 1 }),
	text,
	sort: JSON.stringify({ [column]: sortDir(direction), usernames: column === 'name' ? sortDir(direction) : undefined }),
	...itemsPerPage && { count: itemsPerPage },
	...current && { offset: current },
}), [text, itemsPerPage, current, column, direction]);

function AgentsRoute() {
	const t = useTranslation();
	const canViewAgents = usePermission('manage-livechat-agents');

	const [params, setParams] = useState({ text: '', current: 0, itemsPerPage: 25 });
	const [sort, setSort] = useState(['name', 'asc']);

	const mediaQuery = useMediaQuery('(min-width: 1024px)');

	const debouncedParams = useDebouncedValue(params, 500);
	const debouncedSort = useDebouncedValue(sort, 500);
	const query = useQuery(debouncedParams, debouncedSort);
	const agentsRoute = useRoute('omnichannel-agents');
	const context = useRouteParameter('context');
	const id = useRouteParameter('id');

	const onHeaderClick = useMutableCallback((id) => {
		const [sortBy, sortDirection] = sort;

		if (sortBy === id) {
			setSort([id, sortDirection === 'asc' ? 'desc' : 'asc']);
			return;
		}
		setSort([id, 'asc']);
	});

	const onRowClick = useMutableCallback((id) => () => agentsRoute.push({
		context: 'info',
		id,
	}));

	const { data, reload } = useEndpointDataExperimental('livechat/users/agent', query) || {};


	const header = useMemo(() => [
		<Th key={'name'} direction={sort[1]} active={sort[0] === 'name'} onClick={onHeaderClick} sort='name' w='x200'>{t('Name')}</Th>,
		mediaQuery && <Th key={'username'} direction={sort[1]} active={sort[0] === 'username'} onClick={onHeaderClick} sort='username' w='x140'>{t('Username')}</Th>,
		<Th key={'email'} direction={sort[1]} active={sort[0] === 'emails.adress'} onClick={onHeaderClick} sort='emails.address' w='x120'>{t('Email')}</Th>,
		<Th key={'remove'} w='x40'>{t('Remove')}</Th>,
	].filter(Boolean), [sort, onHeaderClick, t, mediaQuery]);

	const renderRow = useCallback(({ emails, _id, username, name, avatarETag }) => <Table.Row key={_id} tabIndex={0} role='link' onClick={onRowClick(_id)} action qa-user-id={_id}>
		<Table.Cell withTruncatedText>
			<Box display='flex' alignItems='center'>
				<UserAvatar size={mediaQuery ? 'x28' : 'x40'} title={username} username={username} etag={avatarETag}/>
				<Box display='flex' withTruncatedText mi='x8'>
					<Box display='flex' flexDirection='column' alignSelf='center' withTruncatedText>
						<Box fontScale='p2' withTruncatedText color='default'>{name || username}</Box>
						{!mediaQuery && name && <Box fontScale='p1' color='hint' withTruncatedText> {`@${ username }`} </Box>}
					</Box>
				</Box>
			</Box>
		</Table.Cell>
		{mediaQuery && <Table.Cell>
			<Box fontScale='p2' withTruncatedText color='hint'>{ username }</Box> <Box mi='x4'/>
		</Table.Cell>}
		<Table.Cell withTruncatedText>{emails && emails.length && emails[0].address}</Table.Cell>
		<RemoveAgentButton _id={_id} reload={reload}/>
	</Table.Row>, [mediaQuery, reload, onRowClick]);


	const EditAgentsTab = useCallback(() => {
		if (!context) {
			return '';
		}
		const handleVerticalBarCloseButtonClick = () => {
			agentsRoute.push({});
		};

		return <VerticalBar className={'contextual-bar'}>
			<VerticalBar.Header>
				{context === 'edit' && t('Edit_User')}
				{context === 'info' && t('User_Info')}
				<VerticalBar.Close onClick={handleVerticalBarCloseButtonClick} />
			</VerticalBar.Header>

			{context === 'edit' && <AgentEdit uid={id}/>}
			{context === 'info' && <AgentInfo uid={id}><AgentInfoActions id={id} reload={reload} /></AgentInfo>}

		</VerticalBar>;
	}, [t, context, id, agentsRoute, reload]);

	if (!canViewAgents) {
		return <NotAuthorizedPage />;
	}


	return <ManageAgents
		setParams={setParams}
		params={params}
		onHeaderClick={onHeaderClick}
		data={data} useQuery={useQuery}
		reload={reload}
		header={header}
		renderRow={renderRow}
		title={'Agents'}>
		<EditAgentsTab />
	</ManageAgents>;
}

export default AgentsRoute;
